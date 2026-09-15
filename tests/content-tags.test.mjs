import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseContentTags, validateContentTags, stripContentTags, contentTagsOf, TAGS, LIVE_ALIASES } from '@/lib/content-tags';
import { resolveIntent, offersForFilter } from '@/lib/content-resolver';
import { parseHijriEventTag, ramadanLastTenNights, hijriToGregorian } from '@/lib/hijri';
import { extractFaq, faqPageJsonLd } from '@/lib/article-schema';

describe('parseContentTags — placeholder tags inside markdown', () => {
  test('splits markdown and recognised self-closing tags, keeps order', () => {
    const body = 'Intro.\n\n<CommercialCTA to="/omra-ramadan" />\n\n## Suite\n\n<ReviewQuote id="8f1c2d4e-1111-4222-8333-444455556666" />\nFin.';
    const segs = parseContentTags(body);
    assert.deepEqual(segs.map((s) => s.type), ['markdown', 'tag', 'markdown', 'tag', 'markdown']);
    assert.equal(segs[1].name, 'CommercialCTA');
    assert.deepEqual(segs[1].attrs, { to: '/omra-ramadan' });
    assert.equal(segs[3].attrs.id, '8f1c2d4e-1111-4222-8333-444455556666');
    assert.match(segs[4].text, /^\nFin\.$/);
  });
  test('the {{live:…}} spelling maps to the same components, with bare or quoted values', () => {
    const segs = parseContentTags('a\n\n{{live:departures filter=ramadan limit=4}}\n\n{{live:cta intent="month:10"}}\n\n{{live:hajj_bridge}}\n\nb');
    const tags = segs.filter((s) => s.type === 'tag');
    assert.deepEqual(tags.map((s) => s.name), ['LiveDepartures', 'CommercialCTA', 'HajjBridgeCTA']);
    assert.deepEqual(tags[0].attrs, { filter: 'ramadan', limit: '4' });
    assert.deepEqual(tags[1].attrs, { intent: 'month:10' });
    assert.deepEqual(tags[2].attrs, {});
  });
  test('an unknown <Tag /> stays in the markdown; an unknown {{live:x}} becomes an "unknown" segment that renders nothing', () => {
    const segs = parseContentTags('a <PriceTable /> b');
    assert.equal(segs.length, 1);
    assert.equal(segs[0].type, 'markdown');
    const live = parseContentTags('a {{live:weather city=makkah}} b');
    assert.deepEqual(live.map((s) => s.type), ['markdown', 'unknown', 'markdown']);
    assert.equal(stripContentTags('a {{live:weather}} b'), 'a  b');
  });
  test('a non-self-closing or attribute-less-required tag is not a segment', () => {
    assert.equal(parseContentTags('<CommercialCTA to="/hajj">').every((s) => s.type === 'markdown'), true);
  });
  test('stripContentTags removes only the tags', () => {
    assert.equal(stripContentTags('a <DepositPolicy /> b'), 'a  b');
    assert.equal(contentTagsOf('x <HajjBridgeCTA /> {{live:policy key=deposit}}').length, 2);
  });
  test('every live alias names a registered tag', () => {
    for (const name of Object.values(LIVE_ALIASES)) assert.ok(name in TAGS, name);
  });
});

describe('validateContentTags — what the gate fails', () => {
  test('a clean body has no problems', () => {
    assert.deepEqual(validateContentTags('x <LiveDepartures month="10" /> y <DepositPolicy /> <HijriCountdown event="ramadan" /> <CommercialCTA intent="ramadan" /> {{live:countdown event=arafah_1448}} {{live:policy key=passport_validity}} <PriceRange filter="month:2" /> <RamadanNightsTable year="1448" />'), []);
  });
  test('unknown tag, unknown attribute, bad value, missing required, bad CTA target, bad event, bad uuid', () => {
    const p = validateContentTags([
      '<PriceTable />',
      '<CommercialCTA to="/omra-ramadan" size="big" />',
      '<LiveDepartures month="13" />',
      '<ReviewQuote />',
      '<CommercialCTA to="/blog/x" />',
      '<HijriCountdown event="christmas" />',
      '<ReviewQuote id="42" />',
      '<CommercialCTA to="/hajj">',
    ].join('\n'));
    assert.equal(p.length, 8, p.join(' | '));
    assert.match(p[0], /balise inconnue <PriceTable>/);
    assert.match(p[1], /attribut inconnu « size »/);
    assert.match(p[2], /mois 1–12/);
    assert.match(p[3], /« id » requis/);
    assert.match(p[4], /page commerciale/);
    assert.match(p[5], /événement inconnu/);
    assert.match(p[6], /uuid attendu/);
    assert.match(p[7], /auto-fermante/);
  });
  test('the brief-specific rules: a CTA needs to or intent, an unknown intent, filter, policy key or live alias fails', () => {
    const p = validateContentTags('<CommercialCTA /> <CommercialCTA intent="cheap" /> <LiveDepartures filter="weekend" /> <PolicyFact key="refund" /> {{live:weather}}');
    assert.equal(p.length, 5, p.join(' | '));
    assert.match(p[0], /« to » \/ « intent » est requis/);
    assert.match(p[1], /intention inconnue/);
    assert.match(p[2], /filtre inconnu/);
    assert.match(p[3], /clé inconnue/);
    assert.match(p[4], /balise inconnue \{\{live:weather\}\}/);
  });
  test('every tag in TAGS validates with its required attributes only', () => {
    for (const [name, spec] of Object.entries(TAGS)) {
      const attrs = [...spec.required, ...(spec.oneOf ? [spec.oneOf[0]] : [])]
        .map((k) => `${k}="${k === 'id' ? '8f1c2d4e-1111-4222-8333-444455556666' : k === 'to' ? '/bab-makka' : k === 'event' ? 'ramadan' : k === 'key' ? 'deposit' : k === 'slug' ? 'anjum' : '1'}"`).join(' ');
      assert.deepEqual(validateContentTags(`<${name} ${attrs} />`), [], name);
    }
  });
});

describe('resolveIntent — the commercial-intent resolver', () => {
  const occasions = [{ slug: 'ramadan', is_published: true }, { slug: '5-etoiles', is_published: true }, { slug: 'rajab', is_published: false }];
  const offers = [{ date_start: '2026-10-06', occasion: { slug: 'ete' }, starting_price: 12900 }];
  const today = new Date('2026-09-14T10:00:00Z');
  test('known intents resolve to their lander; unpublished or noindex ones fall back to the hub', () => {
    assert.equal(resolveIntent('ramadan', { occasions }).path, '/omra-ramadan');
    assert.equal(resolveIntent('hajj').path, '/hajj');
    assert.equal(resolveIntent('agency').path, '/agence-omra-casablanca');
    assert.equal(resolveIntent('premium', { occasions }).path, '/omra-5-etoiles');
    assert.equal(resolveIntent('occasion:rajab', { occasions }).path, '/bab-makka');
    assert.equal(resolveIntent('pas_cher', { offers }).path, '/omra-pas-cher');
    assert.equal(resolveIntent('pas_cher', { offers: [] }).path, '/bab-makka');
    assert.equal(resolveIntent('guide', { guidePages: new Map() }).path, '/bab-makka');
    assert.equal(resolveIntent('nonsense').path, '/bab-makka');
  });
  test('a month resolves only when its lander is indexable (a departure this cycle or the authored blocks)', () => {
    assert.equal(resolveIntent('month:10', { offers, today }).path, '/omra-octobre');
    const dec = resolveIntent('month:12', { offers, today });
    assert.equal(dec.path, '/bab-makka');
    assert.deepEqual(dec.scope, { month: 11 });
  });
  test('a city resolves only when its page passes the anti-doorway guard', () => {
    const cityPages = new Map([['fes', { is_indexable: true, intro_fr: 'x', intro_ar: 'y' }], ['oujda', { is_indexable: true, intro_fr: 'x', intro_ar: null }]]);
    assert.equal(resolveIntent('city:fes', { cityPages }).path, '/omra-depuis-fes');
    assert.equal(resolveIntent('city:oujda', { cityPages }).path, '/bab-makka');
    assert.equal(resolveIntent('city:paris', { cityPages }).path, '/bab-makka');
  });
  test('offersForFilter: hajj never lists, ramadan scopes by occasion, next is the first', () => {
    const list = [{ occasion: { slug: 'ramadan' } }, { occasion: { slug: 'ete' } }];
    assert.equal(offersForFilter(list, 'hajj').length, 0);
    assert.equal(offersForFilter(list, 'ramadan').length, 1);
    assert.equal(offersForFilter(list, 'next').length, 1);
    assert.equal(offersForFilter(list, 'all').length, 2);
  });
});

describe('Hijri tag vocabulary and the last ten nights', () => {
  test('parseHijriEventTag accepts run-1 keys and the dated brief keys', () => {
    assert.deepEqual(parseHijriEventTag('ramadan'), { key: 'ramadan', hy: null });
    assert.deepEqual(parseHijriEventTag('ramadan_1448_start'), { key: 'ramadan', hy: 1448 });
    assert.deepEqual(parseHijriEventTag('ramadan_1448_last10'), { key: 'ramadan-last10', hy: 1448 });
    assert.deepEqual(parseHijriEventTag('arafah_1448'), { key: 'arafat', hy: 1448 });
    assert.deepEqual(parseHijriEventTag('eid_al_fitr_1448'), { key: 'eid-al-fitr', hy: 1448 });
    assert.deepEqual(parseHijriEventTag('mawlid_1449'), { key: 'mawlid', hy: 1449 });
    assert.equal(parseHijriEventTag('christmas_2027'), null);
  });
  test('the last ten nights of Ramadan 1448 start on the evening of 20 Ramadan and flag the odd nights', () => {
    const nights = ramadanLastTenNights(1448);
    assert.equal(nights.length, 10);
    assert.equal(nights[0].night, 21);
    assert.equal(nights[0].day_date, hijriToGregorian(1448, 9, 21));
    assert.equal(nights.filter((n) => n.odd).map((n) => n.night).join(','), '21,23,25,27,29');
    const confirmed = ramadanLastTenNights(1448, '2027-02-09');
    assert.equal(confirmed[0].day_date, '2027-03-01');
  });
});

describe('extractFaq — the FAQ section → FAQPage', () => {
  test('reads the ### items under the FAQ heading and stops at the next section', () => {
    const body = '## Comment ?\n\nTexte.\n\n## Questions fréquentes\n\n### Première question ?\n\nRéponse **une** avec [lien](/fr/bab-makka).\n\n### Deuxième ?\n\nRéponse deux.\n\n<CommercialCTA intent="ramadan" />\n\n## Conclusion\n\nFin.';
    const faq = extractFaq(body);
    assert.equal(faq.length, 2);
    assert.equal(faq[0].question, 'Première question ?');
    assert.equal(faq[0].answer, 'Réponse une avec lien.');
    const node = faqPageJsonLd(faq);
    assert.equal(node['@type'], 'FAQPage');
    assert.equal(node.mainEntity.length, 2);
    assert.equal(extractFaq('## Rien\n\ntexte').length, 0);
    assert.equal(faqPageJsonLd([]), null);
  });
  test('Arabic and English headings are recognised', () => {
    assert.equal(extractFaq('## الأسئلة الشائعة\n\n### سؤال؟\n\nجواب.').length, 1);
    assert.equal(extractFaq('## Frequently asked questions\n\n### Q?\n\nA.').length, 1);
  });
});
