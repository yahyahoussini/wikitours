import { supabaseServer } from '@/lib/supabase/server';
import { ADMIN_ENTITIES } from '@/lib/admin/registry';

/** Server-side helpers for the generic admin pages. */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wikitours.ma';

/** Public base path per entity for the Google snippet preview. */
const PUBLIC_BASES = {
  offres: '/omra',
  hotels: '/hotel',
  articles: '/blog',
  'landing-pages': '/lp',
};

export async function fetchEntityRows(entityKey) {
  const config = ADMIN_ENTITIES[entityKey];
  const sb = await supabaseServer();
  if (!sb) return [];
  const { data } = await sb
    .from(config.table)
    .select('*')
    .order(config.orderBy ?? 'created_at', { ascending: !config.orderDesc })
    .limit(500);
  return data ?? [];
}

export async function fetchEntityRecord(entityKey, id) {
  const config = ADMIN_ENTITIES[entityKey];
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.from(config.table).select('*').eq('id', id).maybeSingle();
  return data;
}

/** Options for every `rel` field of an entity: [{value, label}]. */
export async function fetchRelOptions(entityKey) {
  const config = ADMIN_ENTITIES[entityKey];
  const sb = await supabaseServer();
  const result = {};
  if (!sb) return result;
  for (const field of config.fields) {
    if (field.type !== 'rel') continue;
    let query = sb.from(field.relTable).select(`id, ${field.relLabel}`).limit(300);
    for (const [k, v] of Object.entries(field.relFilter ?? {})) query = query.eq(k, v);
    const { data } = await query;
    result[field.name] = (data ?? []).map((r) => ({
      value: r.id,
      label: r[field.relLabel] ?? r.id,
    }));
  }
  return result;
}

export async function fetchGalleryItems(table, entityId) {
  const sb = await supabaseServer();
  if (!sb) return [];
  const { data } = await sb
    .from('galleries')
    .select('*, media:media_id (*)')
    .eq('entity_type', table)
    .eq('entity_id', entityId)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

/** Serializable config subset passed to the client form. */
export function clientConfig(entityKey) {
  const config = ADMIN_ENTITIES[entityKey];
  return {
    fields: config.fields,
    publishField: config.publishField,
    hasSeo: config.hasSeo,
    hasGallery: config.hasGallery,
    duplicateDisabled: config.duplicateDisabled ?? false,
    galleryEntityType: config.table,
    title: config.title,
  };
}

export function publicUrlBase(entityKey) {
  const base = PUBLIC_BASES[entityKey];
  return base ? `${SITE_URL}/{locale}${base}` : null;
}
