import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseContentTags, validateContentTags, stripContentTags, TAGS } from '@/lib/content-tags';

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
  test('an unknown tag stays in the markdown (never a component)', () => {
    const segs = parseContentTags('a <PriceTable /> b');
    assert.equal(segs.length, 1);
    assert.equal(segs[0].type, 'markdown');
  });
  test('a non-self-closing or attribute-less-required tag is not a segment', () => {
    assert.equal(parseContentTags('<CommercialCTA to="/hajj">').every((s) => s.type === 'markdown'), true);
  });
  test('stripContentTags removes only the tags', () => {
    assert.equal(stripContentTags('a <DepositPolicy /> b'), 'a  b');
  });
});

describe('validateContentTags — what the gate fails', () => {
  test('a clean body has no problems', () => {
    assert.deepEqual(validateContentTags('x <LiveDepartures month="10" /> y <DepositPolicy /> <HijriCountdown event="ramadan" />'), []);
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
  test('every tag in TAGS validates with its required attributes only', () => {
    for (const [name, spec] of Object.entries(TAGS)) {
      const attrs = spec.required.map((k) => `${k}="${k === 'id' ? '8f1c2d4e-1111-4222-8333-444455556666' : k === 'to' ? '/bab-makka' : k === 'event' ? 'ramadan' : '1'}"`).join(' ');
      assert.deepEqual(validateContentTags(`<${name} ${attrs} />`), [], name);
    }
  });
});
