import { z } from 'zod';
import { ADMIN_ENTITIES } from '@/lib/admin/registry';

/**
 * zod schemas generated from the registry (LAWS §8: zod on every write).
 * Trilingual fields expand to _fr/_ar/_en. Empty strings normalize to null.
 */

const LANGS = ['fr', 'ar', 'en'];

const nullableText = (max = 20000) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

const nullableNumber = z.preprocess(
  (v) => (v === '' || v === undefined ? null : typeof v === 'string' ? Number(v) : v),
  z.number().int().nullable().optional(),
);

const nullableDate = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().max(40).nullable().optional(),
);

function fieldSchema(field) {
  switch (field.type) {
    case 'text':
      return field.required
        ? z.string().trim().min(1).max(2000)
        : nullableText(2000);
    case 'textarea':
      return nullableText();
    case 'number':
      return nullableNumber;
    case 'bool':
      return z.boolean().optional();
    case 'date':
    case 'datetime':
      return nullableDate;
    case 'select': {
      const values = field.options.map((o) => o.value);
      return field.required
        ? z.enum(values)
        : z.preprocess((v) => (v === '' ? null : v), z.enum(values).nullable().optional());
    }
    case 'rel':
      return z.preprocess((v) => (v === '' ? null : v), z.uuid().nullable().optional());
    case 'media':
      // Storage path written by the admin upload route (never a raw URL).
      return nullableText(500);
    default:
      return null;
  }
}

const SEO_KEYS = LANGS.flatMap((l) => [`seo_title_${l}`, `seo_description_${l}`]);

export function buildEntitySchema(entityKey) {
  const config = ADMIN_ENTITIES[entityKey];
  const shape = {};

  for (const field of config.fields) {
    if (field.type.endsWith('3')) {
      for (const lang of LANGS) shape[`${field.name}_${lang}`] = nullableText();
    } else {
      shape[field.name] = fieldSchema(field);
    }
  }
  shape[config.publishField] = z.boolean().optional();
  if (config.hasSeo) {
    for (const key of SEO_KEYS) shape[key] = nullableText(400);
  }

  let schema = z.object(shape).strict();

  // Redirects: valid site-relative paths, no self-loop.
  if (config.table === 'redirects') {
    schema = schema
      .refine((v) => v.from_path?.startsWith('/'), {
        message: 'Le chemin « depuis » doit commencer par /.',
        path: ['from_path'],
      })
      .refine((v) => v.to_path?.startsWith('/') || v.to_path?.startsWith('https://'), {
        message: 'La cible doit commencer par / ou https://.',
        path: ['to_path'],
      })
      .refine((v) => v.from_path !== v.to_path, {
        message: 'Une redirection ne peut pas pointer vers elle-même.',
        path: ['to_path'],
      });
  }

  // Slugs: URL-safe.
  if (config.fields.some((f) => f.name === 'slug')) {
    schema = schema.refine(
      (v) => !v.slug || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug),
      { message: 'Slug invalide (minuscules, chiffres, tirets).', path: ['slug'] },
    );
  }

  return schema;
}

/** Detects a two-step loop against the existing redirect map (A→B, B→A). */
export function wouldLoop(fromPath, toPath, existing) {
  let current = toPath;
  const seen = new Set([fromPath]);
  for (let i = 0; i < 10; i++) {
    if (seen.has(current)) return true;
    seen.add(current);
    const nextHop = existing.get(current);
    if (!nextHop) return false;
    current = nextHop;
  }
  return true;
}

export const settingsSchema = z
  .object({
    default_locale: z.enum(LANGS),
    whatsapp_number: nullableText(40),
    phone_1: nullableText(40),
    phone_2: nullableText(40),
    phone_3: nullableText(40),
    email: nullableText(200),
    address_fr: nullableText(500),
    address_ar: nullableText(500),
    address_en: nullableText(500),
    opening_hours_fr: nullableText(500),
    opening_hours_ar: nullableText(500),
    opening_hours_en: nullableText(500),
    license_number: nullableText(100),
    facebook_url: nullableText(300),
    instagram_url: nullableText(300),
    tiktok_url: nullableText(300),
    youtube_url: nullableText(300),
    gbp_review_url: nullableText(300),
    gbp_rating: z.preprocess(
      (v) => (v === '' || v === undefined ? null : Number(v)),
      z.number().min(0).max(5).nullable().optional(),
    ),
    gbp_review_count: nullableNumber,
    community_count: nullableText(40),
    ga4_id: nullableText(60),
    google_ads_id: nullableText(60),
    google_ads_lead_label: nullableText(120),
    meta_pixel_id: nullableText(60),
    meta_capi_token: nullableText(500),
    tiktok_pixel_id: nullableText(60),
    tiktok_events_token: nullableText(500),
    verification_metas: nullableText(4000),
    consent_banner_enabled: z.boolean().optional(),
    indexnow_key: nullableText(120),
  })
  .strict();

export const leadStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(['new', 'contacted', 'qualified', 'paid_deposit', 'traveled', 'lost']),
});

export const leadNoteSchema = z.object({
  leadId: z.uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const keywordCheckSchema = z.object({
  keyword: z.string().trim().min(1).max(300),
  engine: z.enum(['google', 'chatgpt', 'perplexity', 'gemini', 'ai_overview']),
  position: nullableNumber,
  cited: z.boolean().nullable().optional(),
  checked_at: nullableDate,
  notes: nullableText(1000),
});
