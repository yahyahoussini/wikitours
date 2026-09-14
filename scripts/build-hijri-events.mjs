#!/usr/bin/env node
/**
 * build-hijri-events.mjs — seed / refresh public.hijri_events from the
 * Umm al-Qura calendar (src/lib/hijri.js, @umalqura/core) for the current
 * Hijri year and the next two. Generate-ahead: the countdown component reads
 * the table at request time; nothing is computed by a cron.
 *
 * Idempotent: a row the admin has CONFIRMED (is_confirmed = true, the date
 * moved after the moon sighting) is never overwritten; every other row is
 * upserted with the computed date.
 *
 *   node --import ./tests/register.mjs scripts/build-hijri-events.mjs [--dry]
 * (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env)
 */
import { createClient } from '@supabase/supabase-js';
import { hijriEventsFor, hijriToday } from '@/lib/hijri';

const DRY = process.argv.includes('--dry');
const log = (m) => console.log(`[hijri-events] ${m}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { log('no Supabase env — nothing to do'); process.exit(0); }

const { hy } = hijriToday();
const rows = [hy, hy + 1, hy + 2].flatMap(hijriEventsFor);
log(`${rows.length} events for Hijri years ${hy}–${hy + 2}`);
if (DRY) { for (const r of rows) log(`  ${r.event} ${r.hijri_year} → ${r.gregorian_date}`); process.exit(0); }

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data: confirmed, error: readError } = await sb.from('hijri_events').select('event, hijri_year').eq('is_confirmed', true);
if (readError) { log(`cannot read hijri_events (${readError.message}) — apply supabase/migrations/025_content_system.sql first`); process.exit(1); }
const keep = new Set((confirmed ?? []).map((r) => `${r.event}/${r.hijri_year}`));
const toWrite = rows.filter((r) => !keep.has(`${r.event}/${r.hijri_year}`));
const { error } = await sb.from('hijri_events').upsert(toWrite, { onConflict: 'event,hijri_year' });
if (error) { log(`upsert failed: ${error.message}`); process.exit(1); }
log(`upserted ${toWrite.length} rows · left ${keep.size} confirmed row(s) untouched`);
