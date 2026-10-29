import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CLUSTERS, clusterOfPath, clusterOfArticle, ownerPathOf, OCCASION_BRIDGES, MANDATORY_LINKS, articlesForHub } from '@/lib/clusters';
import { offersForFilter } from '@/lib/content-resolver';
import { getDictionary } from '@/lib/i18n';

describe('clusterOfPath — a pillar wins over a page listing', () => {
  test('every pillar resolves to its own cluster, even when another cluster lists it as a page', () => {
    for (const c of CLUSTERS) {
      assert.equal(clusterOfPath(c.pillar)?.id, c.id, `${c.pillar} should be cluster ${c.id}`);
    }
  });
  test('the four dual-membership paths', () => {
    // /omra-ramadan, /omra-pas-cher and /hotels-omra lead D, C and F while
    // also sitting in cluster A's pages; the first-match lookup gave all of
    // them A, so the Ramadan hub rendered the wrong cluster's links.
    assert.equal(clusterOfPath('/omra-ramadan').id, 'D');
    assert.equal(clusterOfPath('/omra-pas-cher').id, 'C');
    assert.equal(clusterOfPath('/hotels-omra').id, 'F');
    // A path that leads nothing still resolves to a cluster that lists it.
    assert.ok(['C', 'E'].includes(clusterOfPath('/guide-omra/budget').id));
    assert.equal(clusterOfPath('/omra-5-etoiles').id, 'A');
    assert.equal(clusterOfPath('/nowhere'), null);
  });
  test('an article inherits the cluster of the page it supports', () => {
    const ramadanPost = { slug: 'un-nouvel-article', supports_path: '/omra-ramadan', category: 'omra' };
    assert.equal(clusterOfArticle(ramadanPost).id, 'D');
    assert.equal(ownerPathOf(ramadanPost), '/omra-ramadan');
    const hajjPost = { slug: 'autre', supports_path: '/hajj', category: 'hajj' };
    assert.equal(clusterOfArticle(hajjPost).id, 'G');
    // An explicit entry still wins over supports_path and category.
    assert.equal(clusterOfArticle({ slug: 'loterie-hajj-maroc', supports_path: '/bab-makka', category: 'omra' }).id, 'G');
    // No supports_path and no entry: the category decides.
    assert.equal(clusterOfArticle({ slug: 'inconnu', category: 'hotels' }).id, 'F');
  });
});

describe('OCCASION_BRIDGES — Ramadan and Chaâbane-Ramadan show each other', () => {
  test('the bridge runs both ways, and the ramadan filter lists the bridged programmes', () => {
    assert.deepEqual(OCCASION_BRIDGES.ramadan, ['chaabane-ramadan']);
    assert.deepEqual(OCCASION_BRIDGES['chaabane-ramadan'], ['ramadan']);
    const list = [{ occasion: { slug: 'ramadan' } }, { occasion: { slug: 'chaabane-ramadan' } }, { occasion: { slug: 'ete' } }];
    assert.equal(offersForFilter(list, 'ramadan').length, 2);
    assert.equal(offersForFilter(list, 'occasion:ramadan').length, 1);
  });
});

describe('articlesForHub — a hub lists its own posts, then the ones required to link it', () => {
  const posts = [
    { slug: 'omra-en-fevrier-chaabane-puis-ramadan', supports_path: '/omra-fevrier', category: 'omra' },
    { slug: 'jeuner-pendant-omra-ramadan', supports_path: '/omra-ramadan', category: 'omra' },
    { slug: 'rajab-ou-chaabane-plutot-que-ramadan', supports_path: '/omra-ramadan', category: 'omra' },
    { slug: 'quelle-periode-ramadan-choisir-omra', supports_path: '/omra-ramadan', category: 'omra' },
  ];
  test('the Chaâbane-Ramadan hub, which no post supports, lists the posts that must link it', () => {
    assert.deepEqual(articlesForHub('/omra-chaabane-ramadan', posts).map((a) => a.slug), [
      'omra-en-fevrier-chaabane-puis-ramadan', 'rajab-ou-chaabane-plutot-que-ramadan', 'quelle-periode-ramadan-choisir-omra',
    ]);
  });
  test('own posts come first, a post is listed once, and the limit holds', () => {
    const own = { slug: 'un-billet-chaabane', supports_path: '/omra-chaabane-ramadan', category: 'omra' };
    const list = articlesForHub('/omra-chaabane-ramadan', [...posts, own], 2).map((a) => a.slug);
    assert.deepEqual(list, ['un-billet-chaabane', 'omra-en-fevrier-chaabane-puis-ramadan']);
    assert.equal(articlesForHub('/omra-ramadan', posts).length, 3);
    assert.deepEqual(articlesForHub('/nowhere', posts), []);
  });
  test('every mandatory hub target has an anchor in all three languages (ClusterLinks drops a link without one)', () => {
    const targets = new Set(Object.values(MANDATORY_LINKS).flat().filter((t) => t.startsWith('/')));
    for (const locale of ['fr', 'ar', 'en']) {
      const anchors = getDictionary(locale).clusters.anchors;
      for (const t of targets) assert.ok(anchors[t], `${locale}: no clusters.anchors entry for ${t}`);
    }
  });
});
