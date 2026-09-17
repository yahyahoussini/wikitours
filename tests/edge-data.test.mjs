import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getRedirectsMap, clearEdgeMemos } from '../src/lib/edge-data.js';

// The middleware reads the admin redirects through a 60 s memo. A failed read
// used to be memoised as an EMPTY map, and on an edge instance the refresh
// meant to replace it never ran — every admin redirect 404'd in production.

const ROWS = [{ from_path: '/fr/omra-ramadan-2027', to_path: '/fr/omra-ramadan', permanent: true }];
const ok = () => Promise.resolve(new Response(JSON.stringify(ROWS), { status: 200, headers: { 'content-type': 'application/json' } }));
const fail = () => Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
let calls;
let behaviour;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  clearEdgeMemos();
  calls = 0;
  behaviour = [];
  mock.method(globalThis, 'fetch', () => { const next = behaviour[calls] ?? ok; calls += 1; return next(); });
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
});

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
});

test('a failed read is not cached: the next attempt after the retry window loads the redirects', async () => {
  behaviour = [fail, ok];
  assert.equal((await getRedirectsMap()).size, 0);
  mock.timers.tick(11_000);
  const map = await getRedirectsMap();
  assert.equal(map.get('/fr/omra-ramadan-2027')?.to, '/fr/omra-ramadan');
  assert.equal(calls, 2);
});

test('inside the retry window a failure answers from the fallback without calling the database again', async () => {
  behaviour = [fail, ok];
  await getRedirectsMap();
  mock.timers.tick(3_000);
  assert.equal((await getRedirectsMap()).size, 0);
  assert.equal(calls, 1);
});

test('a failed refresh keeps the last good map', async () => {
  behaviour = [ok, fail];
  assert.equal((await getRedirectsMap()).size, 1);
  mock.timers.tick(61_000);
  // Stale value answers immediately while the refresh runs, and fails.
  assert.equal((await getRedirectsMap()).size, 1);
  await new Promise((r) => setImmediate(r));
  mock.timers.tick(61_000);
  assert.equal((await getRedirectsMap()).size, 1);
});

test('a refresh that never settles is replaced instead of blocking every later refresh', async () => {
  behaviour = [ok, () => new Promise(() => {}), ok];
  await getRedirectsMap();
  mock.timers.tick(61_000);
  await getRedirectsMap(); // starts the refresh that hangs
  assert.equal(calls, 2);
  mock.timers.tick(21_000);
  await getRedirectsMap(); // the hung refresh is older than the stuck limit: a new one starts
  assert.equal(calls, 3);
});
