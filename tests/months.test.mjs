import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MONTH_SLUGS, rolloverYear, targetYearFor, departuresInMonth, monthLanderIndexable,
  indexableMonths, retiredRedirectPath, monthName, parseMonthSlug,
} from '@/lib/months';
import { hijriOverlap, historicPriceRange, lastSeasonDepartures, pastDeparturesInMonth } from '@/lib/month-stats';

const utc = (y, m, d) => new Date(Date.UTC(y, m, d, 12));
const JAN = 0, FEB = 1, AUG = 7, SEP = 8, OCT = 9, DEC = 11;
const offer = (date_start, extra = {}) => ({ slug: `o-${date_start}`, date_start, date_end: date_start, ...extra });

describe('rolloverYear — the year a month lander is about, from the calendar', () => {
  test('September 2026: January rolls to 2027, September stays 2026, December stays 2026', () => {
    const today = utc(2026, SEP, 13);
    assert.equal(rolloverYear(JAN, today), 2027);
    assert.equal(rolloverYear(FEB, today), 2027);
    assert.equal(rolloverYear(AUG, today), 2027);
    assert.equal(rolloverYear(SEP, today), 2026);
    assert.equal(rolloverYear(OCT, today), 2026);
    assert.equal(rolloverYear(DEC, today), 2026);
  });
  test('month boundary: 30 Sept keeps September this year, 1 Oct rolls it to next year', () => {
    assert.equal(rolloverYear(SEP, utc(2026, SEP, 30)), 2026);
    assert.equal(rolloverYear(SEP, utc(2026, OCT, 1)), 2027);
    assert.equal(rolloverYear(OCT, utc(2026, OCT, 1)), 2026);
  });
  test('year boundary: 31 Dec 2026 → December 2026 / January 2027; 1 Jan 2027 → January 2027 / December 2027', () => {
    assert.equal(rolloverYear(DEC, utc(2026, DEC, 31)), 2026);
    assert.equal(rolloverYear(JAN, utc(2026, DEC, 31)), 2027);
    assert.equal(rolloverYear(JAN, utc(2027, JAN, 1)), 2027);
    assert.equal(rolloverYear(FEB, utc(2027, JAN, 1)), 2027);
    assert.equal(rolloverYear(DEC, utc(2027, JAN, 1)), 2027);
  });
  test('every month rolls forward exactly once, the month after its own — December only on 1 January', () => {
    for (let m = 0; m < 12; m++) {
      const years = Array.from({ length: 12 }, (_, t) => rolloverYear(m, utc(2026, t, 15)));
      assert.equal(years[m], 2026, `month ${m} in its own month is this year`);
      for (let t = 0; t <= m; t++) assert.equal(years[t], 2026, `month ${m} seen from month ${t} is this year`);
      for (let t = m + 1; t < 12; t++) assert.equal(years[t], 2027, `month ${m} seen from month ${t} is next year`);
    }
    assert.equal(rolloverYear(DEC, utc(2027, JAN, 1)), 2027);
  });
});

describe('targetYearFor — data first, calendar second', () => {
  const today = utc(2026, SEP, 13);
  test('no departures → the rollover year', () => {
    assert.equal(targetYearFor(JAN, { today, offers: [] }), 2027);
    assert.equal(targetYearFor(SEP, { today, offers: [] }), 2026);
  });
  test('a departure later than the rollover year pulls the page forward (December 2027 while December 2026 is empty)', () => {
    assert.equal(targetYearFor(DEC, { today, offers: [offer('2027-12-05')] }), 2027);
  });
  test('the earliest qualifying departure wins; a past departure never pulls the page back', () => {
    assert.equal(targetYearFor(SEP, { today, offers: [offer('2027-09-10'), offer('2026-09-23')] }), 2026);
    assert.equal(targetYearFor(JAN, { today, offers: [offer('2026-01-10')] }), 2027);
  });
  test('departuresInMonth lists only the target year', () => {
    const offers = [offer('2026-10-06'), offer('2027-10-01'), offer('2026-11-04')];
    assert.deepEqual(departuresInMonth(offers, OCT, { today }).map((o) => o.date_start), ['2026-10-06']);
    assert.deepEqual(departuresInMonth(offers, JAN, { today }), []);
  });
});

describe('monthLanderIndexable — content first, noindex second (hard constraint 10)', () => {
  const today = utc(2026, SEP, 13);
  const filled = { is_indexable: true, weather_fr: 'x', weather_ar: 'س', suits_fr: 'x', suits_ar: 'س' };
  test('a published departure this cycle indexes the month', () => {
    assert.equal(monthLanderIndexable(OCT, { offers: [offer('2026-10-06')], today }), true);
  });
  test('no departure and no authored content → noindex', () => {
    assert.equal(monthLanderIndexable(FEB, { offers: [], monthPage: null, today }), false);
    assert.equal(monthLanderIndexable(FEB, { offers: [], monthPage: { is_indexable: true }, today }), false);
  });
  test('authored fr+ar content with the toggle on → index, even with no departure', () => {
    assert.equal(monthLanderIndexable(FEB, { offers: [], monthPage: filled, today }), true);
    assert.equal(monthLanderIndexable(FEB, { offers: [], monthPage: { ...filled, is_indexable: false }, today }), false);
    assert.equal(monthLanderIndexable(FEB, { offers: [], monthPage: { ...filled, suits_ar: null }, today }), false);
  });
  test('never_sold wins over everything', () => {
    assert.equal(monthLanderIndexable(OCT, { offers: [offer('2026-10-06')], monthPage: { ...filled, never_sold: true }, today }), false);
  });
  test('indexableMonths is the set of the above', () => {
    const pages = new Map([['fevrier', filled], ['mars', { ...filled, never_sold: true }]]);
    assert.deepEqual([...indexableMonths([offer('2026-10-06')], pages, today)].sort(), [FEB, OCT]);
  });
});

describe('retiredRedirectPath — never onto a noindex page', () => {
  test('month lander indexable → the lander; otherwise the hub, flagged', () => {
    const o = offer('2026-07-23');
    assert.deepEqual(retiredRedirectPath(o, 'fr', new Set([6])), { path: '/fr/omra-juillet', fallback: false });
    assert.deepEqual(retiredRedirectPath(o, 'ar', new Set([])), { path: '/ar/bab-makka', fallback: true });
    assert.deepEqual(retiredRedirectPath({ slug: 'x' }, 'en', new Set([6])), { path: '/en/bab-makka', fallback: true });
  });
});

describe('month helpers', () => {
  test('monthName carries no year and is localized', () => {
    assert.equal(monthName(JAN, 'fr'), 'janvier');
    assert.equal(monthName(JAN, 'en'), 'January');
    assert.match(monthName(JAN, 'ar'), /[؀-ۿ]/);
  });
  test('parseMonthSlug flags the dated legacy form', () => {
    assert.deepEqual(parseMonthSlug('omra-juillet'), { monthIndex: 6, monthSlug: 'juillet', legacy: false });
    assert.deepEqual(parseMonthSlug('omra-juillet-2026'), { monthIndex: 6, monthSlug: 'juillet', year: 2026, legacy: true });
    assert.equal(parseMonthSlug('omra-ramadan'), null);
    assert.equal(MONTH_SLUGS.length, 12);
  });
});

describe('month-stats — derived from real departures only', () => {
  const history = [
    offer('2025-10-05', { tiers: [{ price_double: 15900, price_quad: 13900, hotel_makkah: { name: 'Taj Park' } }], duration_days: 15, airline: 'Saudia' }),
    offer('2025-10-19', { starting_price: 12500, duration_days: 8 }),
    offer('2026-10-06', { tiers: [{ price_double: 17300, price_quint: 12300 }] }),
  ];
  test('pastDeparturesInMonth / historicPriceRange', () => {
    const past = pastDeparturesInMonth(history, OCT, utc(2026, SEP, 13));
    assert.deepEqual(past.map((o) => o.date_start), ['2025-10-05', '2025-10-19']);
    assert.deepEqual(historicPriceRange(past), { min: 12500, max: 15900, count: 2, years: [2025] });
    assert.equal(historicPriceRange([]), null);
  });
  test('lastSeasonDepartures picks the most recent past year with what was sold', () => {
    const last = lastSeasonDepartures(history, OCT, 2026);
    assert.equal(last.year, 2025);
    assert.deepEqual(last.departures.map((d) => [d.date_start, d.from, d.hotels, d.airline]), [
      ['2025-10-05', 13900, ['Taj Park'], 'Saudia'],
      ['2025-10-19', 12500, [], null],
    ]);
    assert.equal(lastSeasonDepartures(history, JAN, 2027), null);
  });
  test('hijriOverlap is computed from the Umm al-Qura calendar: February 2027 is Ramadan 1448', () => {
    const feb = hijriOverlap(FEB, 2027, 'fr');
    assert.equal(feb.ramadan, true);
    assert.ok(feb.months.includes(9));
    assert.match(feb.first, /1448/);
    const ar = hijriOverlap(FEB, 2027, 'ar');
    assert.match(ar.first, /[؀-ۿ]/);
    const may = hijriOverlap(4, 2027, 'en'); // Dhu al-Hijja 1448 begins in May 2027
    assert.equal(typeof may.hajj, 'boolean');
  });
});
