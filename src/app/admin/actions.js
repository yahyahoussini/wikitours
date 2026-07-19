'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MEDIA_BUCKET } from '@/lib/media';
import { ENTITY_TYPES, GALLERY_ENTITIES, localizedPaths } from '@/lib/entities';

const GENERIC_ERROR = 'Une erreur est survenue.';

async function requireAdmin() {
  const auth = await supabaseServer();
  if (!auth) throw new Error('unconfigured');
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) throw new Error('unauthorized');
  const admin = supabaseAdmin();
  if (!admin) throw new Error('no-admin-client');
  return admin;
}

/** Revalidates every locale variant of the entity's public page. */
async function revalidateEntity(admin, entityType, entityId) {
  try {
    const entity = GALLERY_ENTITIES[entityType];
    if (!entity) return;
    let row = null;
    if (entity.table) {
      const { data } = await admin
        .from(entity.table)
        .select('slug')
        .eq('id', entityId)
        .maybeSingle();
      row = data;
    }
    for (const path of localizedPaths(entity.publicPath(row))) {
      revalidatePath(path);
    }
  } catch {
    // Revalidation is best-effort; ISR (60s) covers the rest.
  }
}

const altSchema = z.object({
  id: z.uuid(),
  alt_fr: z.string().trim().max(300).nullable(),
  alt_ar: z.string().trim().max(300).nullable(),
  alt_en: z.string().trim().max(300).nullable(),
});

export async function updateMediaAlt(input) {
  try {
    const admin = await requireAdmin();
    const { id, ...alts } = altSchema.parse({
      ...input,
      alt_fr: input.alt_fr || null,
      alt_ar: input.alt_ar || null,
      alt_en: input.alt_en || null,
    });
    const { error } = await admin.from('media').update(alts).eq('id', id);
    if (error) return { ok: false, error: GENERIC_ERROR };
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Delete with usage check: refuses when the media is attached to any
 * gallery and reports where, so the admin detaches first (no dead links).
 */
export async function deleteMedia(id) {
  try {
    const admin = await requireAdmin();
    const parsedId = z.uuid().parse(id);

    const { data: usage, error: usageError } = await admin
      .from('galleries')
      .select('entity_type')
      .eq('media_id', parsedId);
    if (usageError) return { ok: false, error: GENERIC_ERROR };

    if (usage.length > 0) {
      const counts = {};
      for (const u of usage) counts[u.entity_type] = (counts[u.entity_type] ?? 0) + 1;
      const where = Object.entries(counts)
        .map(([t, n]) => `${GALLERY_ENTITIES[t]?.adminLabel ?? t} (${n})`)
        .join(', ');
      return {
        ok: false,
        error: `Média utilisé dans : ${where}. Détachez-le d'abord.`,
      };
    }

    const { data: media } = await admin
      .from('media')
      .select('path')
      .eq('id', parsedId)
      .maybeSingle();

    const { error: deleteError } = await admin.from('media').delete().eq('id', parsedId);
    if (deleteError) return { ok: false, error: GENERIC_ERROR };

    if (media?.path) {
      await admin.storage.from(MEDIA_BUCKET).remove([media.path]);
    }
    revalidatePath('/admin/media');
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

// entityId is guid, not uuid: virtual galleries (settings_hero/office/team)
// use sentinel ids whose version bits fail Zod 4's strict RFC uuid check.
// DB-generated ids (media, gallery rows) stay strict.
const attachSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.guid(),
  mediaId: z.uuid(),
});

export async function attachMedia(input) {
  try {
    const admin = await requireAdmin();
    const { entityType, entityId, mediaId } = attachSchema.parse(input);

    const { data: last } = await admin
      .from('galleries')
      .select('sort_order')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: item, error } = await admin
      .from('galleries')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        media_id: mediaId,
        sort_order: (last?.sort_order ?? -1) + 1,
      })
      .select('*, media:media_id (*)')
      .single();
    if (error) return { ok: false, error: GENERIC_ERROR };

    await revalidateEntity(admin, entityType, entityId);
    return { ok: true, item };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

const detachSchema = z.object({
  galleryId: z.uuid(),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.guid(),
});

export async function detachMedia(input) {
  try {
    const admin = await requireAdmin();
    const { galleryId, entityType, entityId } = detachSchema.parse(input);
    const { error } = await admin
      .from('galleries')
      .delete()
      .eq('id', galleryId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
    if (error) return { ok: false, error: GENERIC_ERROR };
    await revalidateEntity(admin, entityType, entityId);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

const reorderSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.guid(),
  orderedIds: z.array(z.uuid()).min(1).max(200),
});

/** Persists a drag-drop reorder: sort_order = index in orderedIds. */
export async function reorderGallery(input) {
  try {
    const admin = await requireAdmin();
    const { entityType, entityId, orderedIds } = reorderSchema.parse(input);

    for (const [index, galleryId] of orderedIds.entries()) {
      const { error } = await admin
        .from('galleries')
        .update({ sort_order: index })
        .eq('id', galleryId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      if (error) return { ok: false, error: GENERIC_ERROR };
    }

    await revalidateEntity(admin, entityType, entityId);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

const signInSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

/**
 * Server-side login: the session cookie is set by the server and a failed
 * attempt always waits 1s before answering — the delay cannot be skipped
 * client-side. Single admin; sign-ups stay disabled in Supabase Auth.
 */
export async function signIn(prevState, formData) {
  const failed = { error: 'Identifiants incorrects.' };
  try {
    const auth = await supabaseServer();
    if (!auth) {
      return { error: 'Supabase n’est pas configuré (.env.local).' };
    }
    const parsed = signInSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    if (!parsed.success) {
      await new Promise((r) => setTimeout(r, 1000));
      return failed;
    }
    const { error } = await auth.auth.signInWithPassword(parsed.data);
    if (error) {
      await new Promise((r) => setTimeout(r, 1000));
      return failed;
    }
  } catch {
    return { error: GENERIC_ERROR };
  }
  redirect('/admin');
}

export async function signOut() {
  const auth = await supabaseServer();
  if (auth) await auth.auth.signOut();
  redirect('/admin/login');
}
