import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hijriToGregorian, gregorianToHijri, hijriEventsFor, nextHijriEvent, todayCasablanca, HIJRI_EVENT_DEFS } from '@/lib/hijri';

describe('hijri — Umm al-Qura conversions', () => {
  test('round-trips a date', () => {
    const h = gregorianToHijri('2026-09-14');
    assert.deepEqual(h, { hy: 1448, hm: 4, hd: 3 });
    assert.equal(hijriToGregorian(h.hy, h.hm, h.hd), '2026-09-14');
  });
  test('1 Ramadan 1448 is in February 2027 (the calendar the site already uses via Intl)', () => {
    const intl = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(`${hijriToGregorian(1448, 9, 1)}T12:00:00Z`));
    const get = (t) => Number(intl.find((p) => p.type === t).value);
    assert.equal(get('month'), 9);
    assert.equal(get('day'), 1);
    assert.match(hijriToGregorian(1448, 9, 1), /^2027-02-/);
  });
  test('hijriEventsFor lists every defined event with an ISO date', () => {
    const ev = hijriEventsFor(1448);
    assert.equal(ev.length, HIJRI_EVENT_DEFS.length);
    for (const e of ev) assert.match(e.gregorian_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(ev.find((e) => e.event === 'eid-al-adha').gregorian_date > ev.find((e) => e.event === 'ramadan').gregorian_date);
  });
  test('nextHijriEvent finds the next occurrence on or after a date, with a day count', () => {
    const n = nextHijriEvent('ramadan', '2026-09-14');
    assert.equal(n.hijri_year, 1448);
    assert.equal(n.gregorian_date, hijriToGregorian(1448, 9, 1));
    assert.ok(n.days > 100 && n.days < 200);
    const same = nextHijriEvent('ramadan', n.gregorian_date);
    assert.equal(same.days, 0);
    assert.equal(nextHijriEvent('nope'), null);
  });
  test('todayCasablanca is a calendar date in Africa/Casablanca', () => {
    assert.match(todayCasablanca(new Date('2026-03-15T23:30:00Z')), /^2026-03-1[56]$/);
    // 23:30 UTC on a non-Ramadan day is 00:30 the next day in Casablanca (UTC+1).
    assert.equal(todayCasablanca(new Date('2026-09-14T23:30:00Z')), '2026-09-15');
  });
});
