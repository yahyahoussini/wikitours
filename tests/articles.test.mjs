import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { qualityGate, proseViolations, targetsLanderQuery, nextMorningSlot, toArticleRow, sampleDrafts } from '@/lib/server/article-gate';

const para = 'Cette phrase de démonstration sert uniquement à vérifier le contrôle qualité automatique du blog et ne contient aucune information réelle. ';
const filler = (n) => Array.from({ length: n }, () => para).join('');
const body = (lang, extra = '') =>
  `${filler(4)}\n\n## Comment cela fonctionne\n\n${filler(8)}\n\n<CommercialCTA to="/bab-makka" />\n\n## Ce qu'il faut prévoir\n\n${filler(8)}${extra}\n\n## Le déroulé\n\n${filler(8)}\n\n## Questions fréquentes\n\n### Première question ?\n\n${filler(3)}\n\n### Deuxième question ?\n\n${filler(3)}\n\n### Troisième question ?\n\n${filler(3)}\n`;
const clean = () => ({
  query_family: 'omra parents ages accessibilite', owner_path: '/bab-makka', category: 'omra', slug: 'test-article',
  title_fr: 'Titre de démonstration', title_ar: 'عنوان تجريبي', title_en: 'Sample title',
  excerpt_fr: 'Extrait de démonstration.', excerpt_ar: 'مقتطف تجريبي.', excerpt_en: 'Sample excerpt.',
  seo_title_fr: 'Titre SEO de démonstration', seo_title_ar: 'عنوان سيو تجريبي', seo_title_en: 'Sample SEO title',
  seo_description_fr: 'Description de démonstration servant à vérifier le contrôle automatique du blog, sans valeur éditoriale, entre cent vingt et cent cinquante caractères.',
  seo_description_ar: 'وصف تجريبي.', seo_description_en: 'Sample description.',
  body_fr: body('fr'), body_ar: body('ar'), body_en: body('en'),
});
const gate = (draft, opts = {}) => qualityGate(draft, { ownerPath: draft.owner_path, existingSlugs: [], priceSet: [], ...opts });

describe('strict gate — no volatile fact in prose', () => {
  test('a clean tagged article passes', () => {
    const g = gate(clean());
    assert.deepEqual(g.problems, []);
  });
  test('a CommercialCTA to the owner satisfies the owner-link rule; a markdown link still does too', () => {
    const d = clean();
    d.body_fr = d.body_fr.replace('<CommercialCTA to="/bab-makka" />', 'Voir [tous les départs](/fr/bab-makka).');
    assert.deepEqual(gate(d).problems, []);
    d.body_fr = d.body_fr.replace('[tous les départs](/fr/bab-makka)', 'rien');
    assert.match(gate(d).problems.join('|'), /page propriétaire \/bab-makka manquant/);
  });
  test('a year, a price, a departure date and a seat count each fail with the field named', () => {
    const d = clean();
    d.body_fr = body('fr', ' Départ prévu en 2026, dès 12 300 MAD, le 23 septembre, il reste 4 places.');
    const p = gate(d).problems.join('\n');
    assert.match(p, /body_fr : année en clair « 2026 »/);
    assert.match(p, /body_fr : montant en clair « 12 300 MAD »/);
    assert.match(p, /body_fr : date en clair « 23 septembre »/);
    assert.match(p, /body_fr : nombre de places en clair « 4 places »/);
  });
  test('the founding year is allowed; a bare price in a title fails; Arabic amounts and Hijri years fail', () => {
    assert.deepEqual(proseViolations('Une agence agréée depuis 2016, à Casablanca.'), []);
    assert.deepEqual(proseViolations('Licensed agency founded in 2016.'), []);
    assert.equal(proseViolations('Omra à partir de 9 900 dirhams').length >= 1, true);
    assert.equal(proseViolations('ابتداءً من 12300 درهم').length >= 1, true);
    assert.equal(proseViolations('في رمضان 1448 هـ').length, 1);
    const d = clean();
    d.title_fr = 'Omra 2026 : combien ça coûte';
    assert.match(gate(d).problems.join('|'), /title_fr : année en clair « 2026 »/);
  });
  test('a Levantine month name or a Latin city name in the Arabic body fails', () => {
    const d = clean();
    d.body_ar = body('ar', ' نسافر في أيلول من Casablanca.');
    const p = gate(d).problems.join('\n');
    assert.match(p, /nom de mois non marocain « أيلول »/);
    assert.match(p, /nom de ville en caractères latins « Casablanca »/);
  });
  test('an unknown tag or a bad attribute fails; a ReviewQuote must exist', () => {
    const d = clean();
    d.body_fr = body('fr', '\n\n<PriceTable />\n\n<ReviewQuote id="8f1c2d4e-1111-4222-8333-444455556666" />');
    const p = gate(d, { testimonialIds: new Set(['00000000-0000-4000-8000-000000000000']) }).problems.join('\n');
    assert.match(p, /balise inconnue <PriceTable>/);
    assert.match(p, /aucun témoignage publié avec cet id/);
  });
  test('a query family that is a lander query fails; a long-tail one passes', () => {
    assert.ok(targetsLanderQuery('omra ramadan 2027'));
    assert.ok(targetsLanderQuery('Omra Octobre'));
    assert.ok(targetsLanderQuery('omra depuis casablanca'));
    assert.ok(targetsLanderQuery('agence omra à Casablanca'));
    assert.ok(targetsLanderQuery('hajj'));
    assert.ok(targetsLanderQuery('عمرة رمضان'));
    assert.equal(targetsLanderQuery('omra ramadan quand reserver'), null);
    assert.equal(targetsLanderQuery('omra parents ages accessibilite'), null);
    const d = clean();
    d.query_family = 'omra janvier';
    assert.match(gate(d).problems.join('|'), /est la requête d'une page commerciale/);
  });
  test('non-strict mode keeps the legacy behaviour (sourced prices flagged, not failed)', () => {
    const { pass } = sampleDrafts({ sourcedPrice: 12900 });
    const g = qualityGate(pass, { ownerPath: '/bab-makka', existingSlugs: [], priceSet: [12900], strict: false });
    assert.deepEqual(g.problems, []);
  });
  test('toArticleRow sets the author record and never a reviewer', () => {
    const row = toArticleRow(clean(), { settings: { blog_author_name: 'Yahya Houssini', blog_reviewer_name: 'Someone' }, slug: 'x', authorId: 'uuid-1' });
    assert.equal(row.author_id, 'uuid-1');
    assert.equal(row.author_name, 'Yahya Houssini');
    assert.equal(row.reviewed_by, null);
    assert.equal(row.reviewer_id, null);
  });
});

describe('nextMorningSlot — 08:00 Africa/Casablanca, whatever the season', () => {
  const localHour = (iso) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Casablanca', hour: '2-digit', hour12: false }).format(new Date(iso)));
  test('outside Ramadan (UTC+1) the slot is 07:00Z = 08:00 Casablanca, the day after', () => {
    const slot = nextMorningSlot(null, new Date('2026-09-14T10:00:00Z'));
    assert.equal(slot, '2026-09-15T07:00:00.000Z');
    assert.equal(localHour(slot), 8);
  });
  test('the slot reads 08:00 in Casablanca in every month of the year (Ramadan suspends DST)', () => {
    for (let m = 0; m < 12; m++) {
      const slot = nextMorningSlot(null, new Date(Date.UTC(2027, m, 10, 12)));
      assert.equal(localHour(slot), 8, slot);
    }
  });
  test('continues after the last scheduled post, never before now', () => {
    const now = new Date('2026-09-14T10:00:00Z');
    assert.equal(nextMorningSlot('2026-09-20T07:00:00Z', now), '2026-09-21T07:00:00.000Z');
    assert.equal(nextMorningSlot('2026-09-01T07:00:00Z', now), '2026-09-15T07:00:00.000Z');
  });
});
