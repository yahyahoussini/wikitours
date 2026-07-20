/**
 * One-off: re-set Cache-Control to 1 year on every existing object in the
 * public-images bucket. New uploads already get this (upload route), but
 * objects created before that change kept Supabase's 1h default — Lighthouse
 * flags them as "inefficient cache". Paths are content-addressed (uuid), so a
 * long TTL is safe: a replaced image always gets a new path.
 *
 * Usage (service role required — DDL-equivalent on storage):
 *   node scripts/backfill-media-cache.mjs           # dry run (lists, no writes)
 *   node scripts/backfill-media-cache.mjs --apply   # perform the update
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the env
 * (load .env.local yourself, or run via a wrapper that does).
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'public-images';
const APPLY = process.argv.includes('--apply');
const ONE_YEAR = '31536000';

if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

/** Recursively list every object path under a prefix (Supabase lists one level). */
async function listAll(prefix = '') {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 100, offset });
    if (error) throw error;
    if (!data.length) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // A folder has no id/metadata; recurse into it.
      if (item.id === null) {
        out.push(...(await listAll(path)));
      } else {
        out.push(path);
      }
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

const paths = await listAll();
console.log(`Found ${paths.length} objects in ${BUCKET}.`);
if (!APPLY) {
  console.log('DRY RUN — re-run with --apply to set Cache-Control 1y. Sample:');
  paths.slice(0, 10).forEach((p) => console.log('  ', p));
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const path of paths) {
  // Re-upload in place with the new cacheControl. download → upsert keeps bytes
  // identical; the only change is the stored Cache-Control metadata.
  const { data: blob, error: dErr } = await sb.storage.from(BUCKET).download(path);
  if (dErr) { console.error('download failed', path, dErr.message); fail++; continue; }
  const buf = Buffer.from(await blob.arrayBuffer());
  const { error: uErr } = await sb.storage.from(BUCKET).upload(path, buf, {
    upsert: true,
    cacheControl: ONE_YEAR,
    contentType: blob.type || undefined,
  });
  if (uErr) { console.error('upload failed', path, uErr.message); fail++; continue; }
  ok++;
  if (ok % 20 === 0) console.log(`  … ${ok}/${paths.length}`);
}
console.log(`Done. ${ok} updated, ${fail} failed.`);
process.exit(fail ? 1 : 0);
