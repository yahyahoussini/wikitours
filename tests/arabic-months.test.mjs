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

test('vowel marks neither fake a word boundary nor hide a month', () => {
  // « مآب » (a return, as in « حسن مآب ») and « الآباء » written with harakat were flagged as « آب ».
  assert.deepEqual(nonMoroccanMonthsIn('حُسْنُ مَآبٍ'), []);
  assert.deepEqual(nonMoroccanMonthsIn('الآبَاءِ'), []);
  assert.deepEqual(nonMoroccanMonthsIn('لِآبَائِهِمْ'), []);
  // …and a Levantine month written with harakat or a tatweel is still caught.
  assert.deepEqual(nonMoroccanMonthsIn('تشرينَ الأول'), ['تشرين الأول']);
  assert.deepEqual(nonMoroccanMonthsIn('فِي آبَ'), ['آب']);
  assert.deepEqual(nonMoroccanMonthsIn('شبـــاط'), ['شباط']);
});
