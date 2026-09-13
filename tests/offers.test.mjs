import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { offerLifecycle, offerIndexable, daysSince, ARCHIVE_DAYS, offerAvailability, hasDeparted } from '@/lib/offers';

const TODAY = '2026-09-13';
const shift = (iso, days) => new Date(Date.UTC(...iso.split('-').map(Number).map((n, i) => (i === 1 ? n - 1 : n))) + days * 86400000).toISOString().slice(0, 10);

describe('offerLifecycle — three states from the return date, no flag', () => {
  test('future departure → live', () => {
    assert.equal(offerLifecycle({ date_start: '2026-10-06', date_end: '2026-10-20' }, TODAY), 'live');
  });
  test('in progress (departed, not yet returned) → live', () => {
    const o = { date_start: '2026-09-09', date_end: '2026-09-23' };
    assert.equal(hasDeparted(o, TODAY), true);
    assert.equal(offerLifecycle(o, TODAY), 'live');
    assert.equal(offerAvailability(o, TODAY), 'https://schema.org/SoldOut');
  });
  test('à la carte (no dates) → live', () => {
    assert.equal(offerLifecycle({ date_start: null, date_end: null }, TODAY), 'live');
  });
  test('returned yesterday → archived; returned 45 days ago → archived', () => {
    assert.equal(offerLifecycle({ date_end: shift(TODAY, -1) }, TODAY), 'archived');
    assert.equal(offerLifecycle({ date_end: shift(TODAY, -45) }, TODAY), 'archived');
  });
  test('returned long ago → retired', () => {
    assert.equal(offerLifecycle({ date_end: shift(TODAY, -200) }, TODAY), 'retired');
    assert.equal(offerLifecycle({ date_end: '2025-08-07' }, TODAY), 'retired');
  });
});

describe('boundary transitions', () => {
  test('live → archived: the return day is still live, the day after is archived', () => {
    const o = { date_start: '2026-08-24', date_end: '2026-09-08' };
    assert.equal(offerLifecycle(o, '2026-09-08'), 'live');
    assert.equal(offerLifecycle(o, '2026-09-09'), 'archived');
  });
  test(`archived → retired: day ${ARCHIVE_DAYS} is archived, day ${ARCHIVE_DAYS + 1} is retired`, () => {
    const o = { date_start: '2026-08-24', date_end: '2026-09-08' };
    assert.equal(daysSince(o.date_end, shift(o.date_end, ARCHIVE_DAYS)), ARCHIVE_DAYS);
    assert.equal(offerLifecycle(o, shift(o.date_end, ARCHIVE_DAYS)), 'archived');
    assert.equal(offerLifecycle(o, shift(o.date_end, ARCHIVE_DAYS + 1)), 'retired');
  });
  test('the transitions hold across a year boundary', () => {
    const o = { date_start: '2026-12-20', date_end: '2026-12-31' };
    assert.equal(offerLifecycle(o, '2026-12-31'), 'live');
    assert.equal(offerLifecycle(o, '2027-01-01'), 'archived');
    assert.equal(offerLifecycle(o, '2027-03-31'), 'archived'); // day 90
    assert.equal(offerLifecycle(o, '2027-04-01'), 'retired'); // day 91
  });
});

describe('offerIndexable — only live departures are indexable / in the sitemap', () => {
  test('live yes, archived and retired no', () => {
    assert.equal(offerIndexable({ date_end: '2026-10-20' }, TODAY), true);
    assert.equal(offerIndexable({ date_end: shift(TODAY, -10) }, TODAY), false);
    assert.equal(offerIndexable({ date_end: shift(TODAY, -100) }, TODAY), false);
  });
});

describe('daysSince', () => {
  test('whole UTC days, DST-proof', () => {
    assert.equal(daysSince('2026-09-08', '2026-09-13'), 5);
    assert.equal(daysSince('2026-12-31', '2027-01-01'), 1);
    assert.equal(daysSince('2026-03-28', '2026-03-30'), 2);
    assert.equal(daysSince('2026-09-20', '2026-09-13'), -7);
  });
});
