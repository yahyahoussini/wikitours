import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { qualityGate, publishDecision, proseViolations, targetsLanderQuery, nextMorningSlot, toArticleRow, sampleDrafts, intentPath, ctaTargets, offWhitelistHost } from '@/lib/server/article-gate';

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
  test('an INTENT that resolves to the owner satisfies the rule too — a body never hard-codes a lander URL', () => {
    // The defect this covers: requiring to="…" forced every post to carry a
    // second, duplicate CTA block just to pass, because G6 forbids a markdown
    // link to a commercial page.
    assert.equal(intentPath('ramadan'), '/omra-ramadan');
    assert.equal(intentPath('agency'), '/agence-omra-casablanca');
    assert.equal(intentPath('month:11'), '/omra-novembre');
    assert.equal(intentPath('city:fes'), '/omra-depuis-fes');
    assert.equal(intentPath('occasion:mawlid'), '/omra-mawlid');
    assert.equal(intentPath('month:13'), null);
    assert.equal(intentPath('city:paris'), null);
    assert.equal(intentPath('nonsense'), null);
    assert.deepEqual([...ctaTargets('<CommercialCTA intent="hajj" />')], ['/hajj']);
    assert.deepEqual([...ctaTargets('{{live:cta intent=month:11}}')], ['/omra-novembre']);
    assert.deepEqual([...ctaTargets('<CommercialCTA intent="ramadan" to="/hajj" />')], ['/hajj'], 'an explicit to wins, whatever the attribute order');
    const d = clean();
    d.owner_path = '/hajj';
    d.body_fr = d.body_fr.replace('<CommercialCTA to="/bab-makka" />', '<CommercialCTA intent="hajj" />');
    d.body_ar = d.body_ar.replace('<CommercialCTA to="/bab-makka" />', '<CommercialCTA intent="hajj" />');
    d.body_en = d.body_en.replace('<CommercialCTA to="/bab-makka" />', '<CommercialCTA intent="hajj" />');
    const g = gate(d, { ownerPath: '/hajj' });
    assert.deepEqual(g.problems, []);
    assert.deepEqual(g.flags.filter((f) => /propriétaire/.test(f)), []);
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
    // The Chaabane-Ramadan category hub owns its head, in both scripts.
    assert.ok(targetsLanderQuery('omra chaabane ramadan'));
    assert.ok(targetsLanderQuery('Omra Chaâbane-Ramadan 2027'));
    assert.ok(targetsLanderQuery('umrah chaabane ramadan'));
    assert.ok(targetsLanderQuery('oumra chaabane et ramadan 2027'));
    assert.ok(targetsLanderQuery('عمرة شعبان رمضان'));
    assert.ok(targetsLanderQuery('عمرة شعبان ورمضان 2027'));
    assert.ok(targetsLanderQuery('عمرة شعبان و رمضان'));
    assert.ok(targetsLanderQuery('عمرة رمضان 2027'));
    assert.ok(targetsLanderQuery('عمرة رمضان ٢٠٢٧'));
    assert.ok(targetsLanderQuery('عمرة رمضان من المغرب'));
    assert.ok(targetsLanderQuery('عمرة رمضان 2027 من المغرب'));
    assert.ok(targetsLanderQuery('عمرة من المغرب'));
    assert.equal(targetsLanderQuery('omra chaabane ramadan que emporter'), null);
    assert.equal(targetsLanderQuery('omra chaabane ramadan 15 ou 25 jours'), null);
    assert.equal(targetsLanderQuery('عمرة شعبان رمضان ماذا أحمل'), null);
    assert.equal(targetsLanderQuery('عمرة رمضان مع الوالدين'), null);
    assert.equal(targetsLanderQuery('عمرة شعبان وحدها رمضان'), null);
    const d = clean();
    d.query_family = 'omra janvier';
    assert.match(gate(d).problems.join('|'), /est la requête d'une page commerciale/);
  });
  test('a link whose slug carries a year is not a year in prose; a visible year still fails', () => {
    // Three existing posts have a year in their slug, and the sibling-link
    // rule asks new posts to link them — the URL used to fire « année en clair ».
    const d = clean();
    d.body_fr = body('fr', ' Voir [notre calendrier](/fr/blog/ramadan-2027-dates-calendrier) et [les dix nuits](/fr/blog/omra-10-derniers-jours-ramadan-2027).');
    assert.deepEqual(gate(d).problems, []);
    // The label is still prose: a year a reader can see is still caught.
    const v = clean();
    v.body_fr = body('fr', ' Voir [le calendrier 2027](/fr/blog/ramadan-2027-dates-calendrier).');
    assert.match(gate(v).problems.join('|'), /body_fr : année en clair « 2027 »/);
  });
  test('an official source is allowed and publishable; any other external link blocks', () => {
    // The defect this covers: every external link used to be a hard blocker,
    // so a Hajj post citing the ministry — which the contract REQUIRES — could
    // never be scheduled.
    assert.equal(offWhitelistHost('https://www.habous.gov.ma/pelerinage/'), null);
    assert.equal(offWhitelistHost('https://umrah.nusuk.sa/'), null);
    assert.equal(offWhitelistHost('https://example.com/x'), 'example.com');
    const settings = { blog_autopublish: true, blog_author_name: 'Yahya Houssini' };
    const ok = clean();
    ok.body_fr = `${ok.body_fr}\n\n## Sources\n\n- [Ministère des Habous](https://www.habous.gov.ma/pelerinage/)\n`;
    const gOk = gate(ok);
    assert.deepEqual(gOk.problems, []);
    assert.equal(publishDecision({ settings, gate: gOk }).publish, true, 'an official source must not block publication');
    const bad = clean();
    bad.body_fr = `${bad.body_fr}\n\n- [Un blog](https://example.com/omra)\n`;
    const gBad = gate(bad);
    assert.match(gBad.problems.join('|'), /hors liste blanche « example\.com »/);
    assert.equal(publishDecision({ settings, gate: gBad }).publish, false);
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
