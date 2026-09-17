import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastModifiedOf } from '../src/lib/freshness.js';

const past = (days) => new Date(Date.now() - days * 864e5).toISOString();
const future = (days) => new Date(Date.now() + days * 864e5).toISOString();

test('a post released after it was written counts at its release', () => {
  const written = past(20); const released = past(2);
  assert.equal(lastModifiedOf({ updated_at: written, published_at: released }), released);
  // …in a listing too: /blog and the home page read the same rows.
  assert.equal(lastModifiedOf([{ updated_at: past(30), published_at: past(25) }, { updated_at: written, published_at: released }]), released);
});

test('an edit after release still wins', () => {
  const edited = past(1);
  assert.equal(lastModifiedOf({ updated_at: edited, published_at: past(5) }), edited);
});

test('a future published_at is not a change yet', () => {
  const written = past(3);
  assert.equal(lastModifiedOf({ updated_at: written, published_at: future(4) }), written);
});

test('strings, dates and nothing', () => {
  assert.equal(lastModifiedOf('2026-01-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'), '2026-03-01T00:00:00.000Z');
  assert.equal(lastModifiedOf(new Date('2026-02-01T00:00:00.000Z')), '2026-02-01T00:00:00.000Z');
  assert.equal(lastModifiedOf(null, [], {}), null);
});
