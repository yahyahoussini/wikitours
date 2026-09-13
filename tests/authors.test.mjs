import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { authorRenderable, teamIndexable, findAuthor, authorName, languagesOf, isOrganisationByline } from '@/lib/authors';

const real = { id: 'a1', name: 'Aya Tahiri', name_ar: 'آية الطاهري', slug: 'aya-tahiri', bio_fr: 'Bio', bio_ar: 'سيرة', is_placeholder: false };
const stub = { id: 'p1', name: 'Yahya Houssini', slug: 'yahya-houssini', role_fr: '[À COMPLÉTER] rôle', is_placeholder: true };
const noBio = { id: 'n1', name: 'Hassan Elasyly', slug: 'hassan-elasyly', is_placeholder: false };

describe('authorRenderable — a profile shows only when it is real', () => {
  test('published person with a slug and a bio → renderable', () => assert.equal(authorRenderable(real), true));
  test('placeholder profile → never, even with a slug', () => assert.equal(authorRenderable({ ...stub, bio_fr: 'x' }), false));
  test('no bio yet → not rendered (the intake form asks for it)', () => assert.equal(authorRenderable(noBio), false));
  test('no slug → not rendered (no stable @id)', () => assert.equal(authorRenderable({ ...real, slug: null }), false));
});

describe('teamIndexable — /equipe indexes with one complete fr+ar profile', () => {
  test('complete profile → indexable', () => assert.equal(teamIndexable([real]), true));
  test('fr-only bio → noindex', () => assert.equal(teamIndexable([{ ...real, bio_ar: null }]), false));
  test('only stubs → noindex', () => assert.equal(teamIndexable([stub, noBio]), false));
});

describe('findAuthor — author_id first, legacy name second, placeholders never', () => {
  const team = [real, stub, noBio];
  test('by author_id', () => assert.equal(findAuthor(team, { author_id: 'a1' })?.slug, 'aya-tahiri'));
  test('by legacy author_name (case-insensitive)', () => assert.equal(findAuthor(team, { author_name: 'aya tahiri' })?.slug, 'aya-tahiri'));
  test('a placeholder never resolves, even by exact name', () => assert.equal(findAuthor(team, { author_name: 'Yahya Houssini' }), null));
  test('a profile without a bio never resolves', () => assert.equal(findAuthor(team, { author_id: 'n1' }), null));
  test('the organisation name resolves to nobody', () => assert.equal(findAuthor(team, { author_name: 'Wiki Tours International' }), null));
  test('reviewer uses reviewer_id / reviewed_by', () => assert.equal(findAuthor(team, { reviewer_id: 'a1' }, 'reviewer')?.slug, 'aya-tahiri'));
});

describe('display helpers', () => {
  test('authorName picks the script of the page', () => {
    assert.equal(authorName(real, 'ar'), 'آية الطاهري');
    assert.equal(authorName(real, 'fr'), 'Aya Tahiri');
    assert.equal(authorName({ ...real, name_ar: null }, 'ar'), 'Aya Tahiri');
  });
  test('languagesOf splits on Latin and Arabic commas', () => {
    assert.deepEqual(languagesOf({ languages: 'français, arabe، darija ; anglais' }), ['français', 'arabe', 'darija', 'anglais']);
    assert.deepEqual(languagesOf({}), []);
  });
  test('isOrganisationByline', () => {
    assert.equal(isOrganisationByline('Wiki Tours International', ['Wiki Tours International', 'Bab Makka']), true);
    assert.equal(isOrganisationByline('Aya Tahiri', ['Wiki Tours International']), false);
  });
});
