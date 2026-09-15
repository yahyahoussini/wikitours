import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nonMoroccanMonthsIn } from '@/lib/server/article-gate';

test('a Levantine month is caught as a word, with or without proclitics', () => {
  assert.deepEqual(nonMoroccanMonthsIn('يبدأ الموسم في آب'), ['آب']);
  assert.deepEqual(nonMoroccanMonthsIn('من شباط إلى آذار'), ['شباط', 'آذار']);
  assert.deepEqual(nonMoroccanMonthsIn('وسبتمبر'), ['سبتمبر']);
  assert.deepEqual(nonMoroccanMonthsIn('بتشرين الأول'), ['تشرين الأول']);
});

test('an ordinary word that merely contains a month name is not a month', () => {
  // « آب » (August) inside « الآباء » (the parents) failed a family post.
  assert.deepEqual(nonMoroccanMonthsIn('للآباء المسافرين مع أطفال'), []);
  assert.deepEqual(nonMoroccanMonthsIn('الإياب والآبار'), []);
});

test('the Moroccan month names are never flagged', () => {
  assert.deepEqual(nonMoroccanMonthsIn('شتنبر وغشت ونونبر ودجنبر ويوليوز'), []);
});
