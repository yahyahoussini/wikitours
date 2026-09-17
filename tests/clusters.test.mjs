import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CLUSTERS, clusterOfPath, clusterOfArticle, ownerPathOf, OCCASION_BRIDGES } from '@/lib/clusters';
import { offersForFilter } from '@/lib/content-resolver';

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
