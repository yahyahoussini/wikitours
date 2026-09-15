#!/usr/bin/env node
/**
 * build-allowed-facts.mjs — writes data/allowed-facts.json: the STABLE facts a
 * Claude Code writing session may state in prose, every one with its source
 * and the date it was read. Nothing else may appear as a fact in an article;
 * volatile facts (prices, departures, dates, seats, hotel lists, the deposit
 * policy wording, review quotes, Hijri countdowns) are never in prose — they
 * render live through the placeholder tags (src/lib/content-tags.js).
 *
 * Sources, in this order:
 *   settings   — the agency's own record (licence, address, phones, hours,
 *                Google rating and count as synced), source "settings" + updated_at
 *   brand      — src/lib/brand.js (names, founding year)
 *   policies   — the published FAQ answers that state a policy (deposit,
 *                payment, passport, visa, children), keyed like <PolicyFact>
 *   catalogue  — what the CURRENT published departures offer: durations,
 *                airlines, hotel names + city (never a price, never a date)
 *   logistics  — the authored city→Mohammed V routes (city_pages.logistics_*)
 *   hijri      — the computed Umm al-Qura dates of the events the calendar
 *                anchors on (±2 days until the sighting), src/lib/hijri.js
 *   faqs       — every published FAQ, verbatim (source "faqs/<id>")
 *   glossary   — every published term (source "glossary_terms/<id>")
 *   i18n       — the departure cities and Moroccan month names the site uses
 *   official   — ministry / Nusuk facts, each with its URL and the date read;
 *                kept by hand in data/official-facts.json (never written here)
 *
 *   npm run content:facts   (node --env-file=.env.local --import ./tests/register.mjs scripts/build-allowed-facts.mjs)
 * Read-only against the database; re-run whenever settings or FAQs change.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { BRAND } from '@/lib/brand';
import { CITY_SLUGS, MONTH_SLUGS, cityName, monthName } from '@/lib/months';
import { hijriEventsFor, hijriToday, TOLERANCE_DAYS } from '@/lib/hijri';

const OUT = new URL('../data/allowed-facts.json', import.meta.url);
const OFFICIAL = new URL('../data/official-facts.json', import.meta.url);
const log = (m) => console.log(`[allowed-facts] ${m}`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { log('no Supabase env — nothing to do'); process.exit(0); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const today = new Date().toISOString().slice(0, 10);

const [{ data: s }, { data: faqs }, { data: terms }, { data: offers }, { data: hotels }, { data: cities }, { data: policies }] = await Promise.all([
  sb.from('settings').select('license_number, address_fr, address_ar, address_en, postal_code, phone_1, phone_2, phone_3, whatsapp_number, email, opening_hours_fr, opening_hours_ar, opening_hours_en, gbp_rating, gbp_review_count, gbp_review_url, updated_at').eq('id', 1).maybeSingle(),
  sb.from('faqs').select('id, category, question_fr, question_ar, question_en, answer_fr, answer_ar, answer_en, updated_at').eq('is_published', true).order('sort_order'),
  sb.from('glossary_terms').select('id, term_fr, term_ar, term_en, definition_fr, definition_ar, definition_en, updated_at').eq('is_published', true).order('sort_order'),
  sb.from('offers').select('slug, duration_days, duration_nights, airline, land_only, date_end, updated_at').eq('is_published', true),
  sb.from('hotels').select('slug, name, city, stars, updated_at').eq('is_published', true).order('name'),
  sb.from('city_pages').select('slug, logistics_fr, logistics_ar, logistics_en, updated_at'),
  sb.from('policies').select('*'),
]);

const fact = (key, value, source, as_of, note) => (value == null || value === '' ? null : { key, value, source, as_of: String(as_of ?? today).slice(0, 10), ...(note ? { note } : {}) });
const entity = [
  fact('organisation', BRAND.parent, 'src/lib/brand.js', today),
  fact('service_omra', BRAND.service, 'src/lib/brand.js', today, 'graphie canonique — jamais « Bab Makkah » en texte'),
  fact('lockup', BRAND.lockup, 'src/lib/brand.js', today),
  fact('fondee_en', 2016, 'src/lib/brand.js / CLAUDE.md (project summary)', today, 'le seul millésime autorisé en prose : « depuis 2016 »'),
  fact('licence', s?.license_number, 'settings.license_number', s?.updated_at, 'licence de voyages, Ministère du Tourisme'),
  fact('ville', 'Casablanca', 'settings.address_fr', s?.updated_at),
  fact('adresse_fr', s?.address_fr, 'settings.address_fr', s?.updated_at),
  fact('adresse_ar', s?.address_ar, 'settings.address_ar', s?.updated_at),
  fact('adresse_en', s?.address_en, 'settings.address_en', s?.updated_at),
  fact('code_postal', s?.postal_code, 'settings.postal_code', s?.updated_at),
  fact('telephone', s?.phone_1, 'settings.phone_1', s?.updated_at),
  fact('whatsapp', s?.whatsapp_number, 'settings.whatsapp_number', s?.updated_at),
  fact('email', s?.email, 'settings.email', s?.updated_at),
  fact('horaires_fr', s?.opening_hours_fr, 'settings.opening_hours_fr', s?.updated_at),
  fact('horaires_ar', s?.opening_hours_ar, 'settings.opening_hours_ar', s?.updated_at),
  fact('horaires_en', s?.opening_hours_en, 'settings.opening_hours_en', s?.updated_at),
  fact('note_google', s?.gbp_rating, 'settings.gbp_rating (synced by /api/cron/sync-reviews)', s?.updated_at, 'visible copy only — never in schema; never rounded up'),
  fact('avis_google', s?.gbp_review_count, 'settings.gbp_review_count (synced)', s?.updated_at, 'changes weekly — quote as « plus de N avis » only if N is the current value'),
  fact('paiement', 'Aucun paiement en ligne : contrat écrit signé à l’agence, acompte versé à l’agence, reçu officiel.', 'dictionaries meta.trustNoPayment · faqs (paiement)', today, 'the amount of the deposit is NOT a fact here — <PolicyFact key="deposit" /> renders the policy live'),
  fact('aeroport_depart', 'Aéroport Mohammed V (Casablanca) — le point de rassemblement de tous les départs', 'city_pages.logistics_fr (8 rows)', today),
  fact('villes_de_depart', Object.keys(CITY_SLUGS).map((slug) => ({ slug, fr: cityName(slug, 'fr'), ar: cityName(slug, 'ar'), en: cityName(slug, 'en') })), 'src/i18n/*.json cities', today, 'Arabic pages use the Arabic name only'),
  fact('mois', MONTH_SLUGS.map((slug, i) => ({ slug, fr: monthName(i, 'fr'), ar: monthName(i, 'ar'), en: monthName(i, 'en') })), 'src/i18n/*.json months', today, 'Moroccan Arabic month names — never the Levantine forms'),
].filter(Boolean);

// Policies: the FAQ answers that state a rule, keyed like <PolicyFact key />.
// The table (migration 026) wins once it exists; the FAQ is the fallback.
const POLICY_FAQ = { deposit: '291929f0', payment: '4b284c89', passport_validity: '87ca3c4a', visa_included: 'db6dea89', children: '5568a11d' };
const policyFacts = Object.entries(POLICY_FAQ).map(([k, prefix]) => {
  const row = (policies ?? []).find((p) => p.key === k);
  const f = (faqs ?? []).find((x) => String(x.id).startsWith(prefix));
  if (row) return { key: k, value: { fr: row.text_fr, ar: row.text_ar, en: row.text_en }, source: `policies/${k}`, as_of: String(row.as_of ?? row.updated_at ?? today).slice(0, 10), note: 'render with <PolicyFact key="…" /> — quote the rule in prose only without figures' };
  if (f) return { key: k, value: { fr: f.answer_fr, ar: f.answer_ar, en: f.answer_en }, source: `faqs/${f.id}`, as_of: String(f.updated_at ?? today).slice(0, 10), note: 'render with <PolicyFact key="…" /> — quote the rule in prose only without figures' };
  return null;
}).filter(Boolean);

// The current catalogue — stable enough to name (durations offered, airlines,
// hotel names and cities), never a price, a date or a distance in prose.
const live = (offers ?? []).filter((o) => !o.date_end || o.date_end >= today);
const durations = [...new Set(live.map((o) => o.duration_days).filter(Boolean))].sort((a, b) => a - b);
const airlines = [...new Set(live.map((o) => o.airline).filter(Boolean))];
const catalogue = [
  fact('durees_proposees_jours', durations, 'offers (published, not returned) duration_days', today, 'the durations currently on sale — say « des séjours de 8 ou 15 jours » only while they are; departures themselves render via <LiveDepartures>'),
  fact('compagnies', airlines, 'offers.airline (published)', today, 'name only — schedules and prices never in prose'),
  fact('hotels_partenaires', (hotels ?? []).map((h) => ({ slug: h.slug, name: h.name, city: h.city, stars: h.stars })), 'hotels (published)', today, 'names, city, stars — the distance renders via <HotelCard slug /> and is never in prose (gate G5)'),
].filter(Boolean);

// City → Mohammed V logistics, as authored by the owner on the city pages.
const logistics = (cities ?? []).map((c) => ({ key: `logistique_${c.slug}`, value: { fr: c.logistics_fr, ar: c.logistics_ar, en: c.logistics_en }, source: `city_pages/${c.slug}.logistics_*`, as_of: String(c.updated_at ?? today).slice(0, 10), note: 'routes, operators and orders of magnitude (km, hours) as written there; no timetable, no fare' })).filter((c) => c.value.fr);

// Hijri anchors: the computed dates, ±TOLERANCE_DAYS until the sighting.
const { hy } = hijriToday();
const hijri = [hy, hy + 1, hy + 2].flatMap(hijriEventsFor).map((e) => ({ key: `${e.event}_${e.hijri_year}`, value: e.gregorian_date, source: 'src/lib/hijri.js (@umalqura/core, Umm al-Qura)', as_of: today, note: `±${TOLERANCE_DAYS} jours selon l'observation de la lune — render via <HijriCountdown event="…" />, never the date in prose` }));

const official = existsSync(OFFICIAL) ? JSON.parse(readFileSync(OFFICIAL, 'utf8')).facts ?? [] : [];

const out = {
  generated_at: new Date().toISOString(),
  rule: 'Only facts listed here may be stated in prose. A fact not listed is written WITHOUT the figure. Volatile facts render live via placeholder tags. No year other than fondee_en, no price, no currency amount, no departure date, no seat count, no hotel distance in prose (gate G5); a number above 10 in prose must appear in this file.',
  entity,
  policies: policyFacts,
  catalogue,
  logistics,
  hijri,
  faq: (faqs ?? []).map((f) => ({ source: `faqs/${f.id}`, as_of: String(f.updated_at ?? today).slice(0, 10), category: f.category, fr: { q: f.question_fr, a: f.answer_fr }, ar: { q: f.question_ar, a: f.answer_ar }, en: { q: f.question_en, a: f.answer_en } })),
  glossary: (terms ?? []).map((t) => ({ source: `glossary_terms/${t.id}`, as_of: String(t.updated_at ?? today).slice(0, 10), fr: { term: t.term_fr, def: t.definition_fr }, ar: { term: t.term_ar, def: t.definition_ar }, en: { term: t.term_en, def: t.definition_en } })),
  // Official facts (ministry, Nusuk): data/official-facts.json, hand-maintained
  // with URL + date read + verification status — copied here, never edited here.
  official,
};
mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
log(`wrote data/allowed-facts.json — ${entity.length} entity · ${policyFacts.length} policies · ${catalogue.length} catalogue · ${logistics.length} logistics · ${hijri.length} hijri · ${out.faq.length} FAQ · ${out.glossary.length} glossary · ${official.length} official`);
