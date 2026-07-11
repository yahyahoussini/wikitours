'use server';

import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { ADMIN_ENTITIES, computeStartingPrice } from '@/lib/admin/registry';
import {
  buildEntitySchema,
  wouldLoop,
  settingsSchema,
  leadStatusSchema,
  leadNoteSchema,
  keywordCheckSchema,
} from '@/lib/admin/schemas';
import { revalidateForTable } from '@/lib/revalidate';

const GENERIC_ERROR = 'Une erreur est survenue.';
const entityKeySchema = z.enum(Object.keys(ADMIN_ENTITIES));

/**
 * All writes go through the AUTHENTICATED client — RLS's admin_full_access
 * policy applies, and getUser() is server-verified on every action.
 */
async function requireAuthClient() {
  const sb = await supabaseServer();
  if (!sb) throw new Error('unconfigured');
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return sb;
}

function firstZodMessage(error) {
  return error?.issues?.[0]?.message ?? GENERIC_ERROR;
}

export async function saveEntity(entityKey, id, values) {
  try {
    const key = entityKeySchema.parse(entityKey);
    const config = ADMIN_ENTITIES[key];
    const sb = await requireAuthClient();

    const parsed = buildEntitySchema(key).safeParse(values);
    if (!parsed.success) return { ok: false, error: firstZodMessage(parsed.error) };
    const data = { ...parsed.data };

    if (config.table === 'offers') {
      data.starting_price = computeStartingPrice(data);
    }

    if (config.table === 'redirects') {
      const { data: rows } = await sb
        .from('redirects')
        .select('id, from_path, to_path')
        .eq('is_active', true);
      const map = new Map(
        (rows ?? []).filter((r) => r.id !== id).map((r) => [r.from_path, r.to_path]),
      );
      if (wouldLoop(data.from_path, data.to_path, map)) {
        return { ok: false, error: 'Cette redirection créerait une boucle.' };
      }
    }

    const query = id
      ? sb.from(config.table).update(data).eq('id', id)
      : sb.from(config.table).insert(data);
    const { data: row, error } = await query.select().single();
    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ce slug (ou cette valeur unique) existe déjà.' };
      }
      return { ok: false, error: GENERIC_ERROR };
    }

    revalidateForTable(config.table, row);
    return { ok: true, row };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function togglePublish(entityKey, id, value) {
  try {
    const key = entityKeySchema.parse(entityKey);
    const config = ADMIN_ENTITIES[key];
    const sb = await requireAuthClient();
    const { data: row, error } = await sb
      .from(config.table)
      .update({ [config.publishField]: z.boolean().parse(value) })
      .eq('id', z.uuid().parse(id))
      .select()
      .single();
    if (error) return { ok: false, error: GENERIC_ERROR };
    revalidateForTable(config.table, row);
    return { ok: true, row };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

const STATUS_CYCLE = { open: 'few_left', few_left: 'full', full: 'open' };

/** Inline status pill on the Offres list: open → few_left → full → open. */
export async function cycleOfferStatus(id) {
  try {
    const sb = await requireAuthClient();
    const parsedId = z.uuid().parse(id);
    const { data: offer } = await sb.from('offers').select('status').eq('id', parsedId).single();
    if (!offer) return { ok: false, error: GENERIC_ERROR };
    const nextStatus = STATUS_CYCLE[offer.status] ?? 'open';
    const { data: row, error } = await sb
      .from('offers')
      .update({ status: nextStatus })
      .eq('id', parsedId)
      .select()
      .single();
    if (error) return { ok: false, error: GENERIC_ERROR };
    revalidateForTable('offers', row);
    return { ok: true, row };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Duplicate: copies the row (galleries included), deduplicates the slug and
 * lands UNPUBLISHED. clearFields supports "Dupliquer pour le prochain
 * départ" (clears the dates only — the 2-minute monthly update).
 */
export async function duplicateEntity(entityKey, id, clearFields = []) {
  try {
    const key = entityKeySchema.parse(entityKey);
    const config = ADMIN_ENTITIES[key];
    const sb = await requireAuthClient();

    const { data: source } = await sb
      .from(config.table)
      .select('*')
      .eq('id', z.uuid().parse(id))
      .single();
    if (!source) return { ok: false, error: GENERIC_ERROR };

    const copy = { ...source };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    copy[config.publishField] = false;
    for (const field of z.array(z.string()).parse(clearFields)) {
      if (field in copy) copy[field] = null;
    }

    if ('slug' in copy && copy.slug) {
      const base = copy.slug.replace(/-copie(-\d+)?$/, '');
      const { data: existing } = await sb
        .from(config.table)
        .select('slug')
        .like('slug', `${base}%`);
      const taken = new Set((existing ?? []).map((r) => r.slug));
      let candidate = `${base}-copie`;
      for (let n = 2; taken.has(candidate); n++) candidate = `${base}-copie-${n}`;
      copy.slug = candidate;
    }

    const { data: row, error } = await sb.from(config.table).insert(copy).select().single();
    if (error) return { ok: false, error: GENERIC_ERROR };

    // Carry the gallery over so the duplicate is visually ready.
    const { data: gallery } = await sb
      .from('galleries')
      .select('media_id, sort_order')
      .eq('entity_type', config.table)
      .eq('entity_id', id);
    if (gallery?.length) {
      await sb.from('galleries').insert(
        gallery.map((g) => ({
          entity_type: config.table,
          entity_id: row.id,
          media_id: g.media_id,
          sort_order: g.sort_order,
        })),
      );
    }

    return { ok: true, row };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteEntity(entityKey, id) {
  try {
    const key = entityKeySchema.parse(entityKey);
    const config = ADMIN_ENTITIES[key];
    const sb = await requireAuthClient();
    const parsedId = z.uuid().parse(id);

    const { data: row } = await sb.from(config.table).select('*').eq('id', parsedId).single();
    const { error } = await sb.from(config.table).delete().eq('id', parsedId);
    if (error) return { ok: false, error: GENERIC_ERROR };

    await sb.from('galleries').delete().eq('entity_type', config.table).eq('entity_id', parsedId);
    revalidateForTable(config.table, row);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function saveSettings(values) {
  try {
    const sb = await requireAuthClient();
    const parsed = settingsSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: firstZodMessage(parsed.error) };
    const { error } = await sb.from('settings').update(parsed.data).eq('id', 1);
    if (error) return { ok: false, error: GENERIC_ERROR };
    revalidateForTable('settings');
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateLeadStatus(input) {
  try {
    const sb = await requireAuthClient();
    const { id, status } = leadStatusSchema.parse(input);
    const { error } = await sb.from('leads').update({ status }).eq('id', id);
    if (error) return { ok: false, error: GENERIC_ERROR };
    await sb.from('lead_activities').insert({
      lead_id: id,
      kind: 'status_change',
      body: status,
      created_by: 'admin',
    });
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function addLeadNote(input) {
  try {
    const sb = await requireAuthClient();
    const { leadId, body } = leadNoteSchema.parse(input);
    const { error } = await sb.from('lead_activities').insert({
      lead_id: leadId,
      kind: 'note',
      body,
      created_by: 'admin',
    });
    if (error) return { ok: false, error: GENERIC_ERROR };
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

const leadFieldsSchema = z.object({
  id: z.uuid(),
  value_mad: z.preprocess(
    (v) => (v === '' || v === undefined ? null : Number(v)),
    z.number().int().nonnegative().nullable(),
  ),
  assigned_to: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(120).nullable(),
  ),
});

export async function updateLeadFields(input) {
  try {
    const sb = await requireAuthClient();
    const { id, ...fields } = leadFieldsSchema.parse(input);
    const { error } = await sb.from('leads').update(fields).eq('id', id);
    if (error) return { ok: false, error: GENERIC_ERROR };
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** "Demander un avis" (status traveled): logs the review request. */
export async function logReviewRequest(leadId) {
  try {
    const sb = await requireAuthClient();
    const { error } = await sb.from('lead_activities').insert({
      lead_id: z.uuid().parse(leadId),
      kind: 'review_request',
      body: 'Lien d’avis Google envoyé',
      created_by: 'admin',
    });
    if (error) return { ok: false, error: GENERIC_ERROR };
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function addKeywordCheck(values) {
  try {
    const sb = await requireAuthClient();
    const parsed = keywordCheckSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: firstZodMessage(parsed.error) };
    const { error } = await sb.from('keyword_checks').insert({
      ...parsed.data,
      checked_at: parsed.data.checked_at ?? new Date().toISOString(),
    });
    if (error) return { ok: false, error: GENERIC_ERROR };
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteKeywordCheck(id) {
  try {
    const sb = await requireAuthClient();
    const { error } = await sb.from('keyword_checks').delete().eq('id', z.uuid().parse(id));
    if (error) return { ok: false, error: GENERIC_ERROR };
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}
