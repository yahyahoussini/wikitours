import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Next renders the (protected) layout and its page in PARALLEL, so the layout's
// redirect did not stop a page from reading data: logged-out GETs got a 307 to
// /admin/login with the page's data in the body (the media library, read with
// the service role). Every page must check the admin itself, first thing.

const ROOT = fileURLToPath(new URL('../src/app/admin/(protected)/', import.meta.url));

function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? pages(join(dir, e.name)) : e.name === 'page.js' ? [join(dir, e.name)] : [],
  );
}

test('the admin area has pages to check', () => {
  assert.ok(pages(ROOT).length >= 10);
});

test('every protected admin page calls requireAdminPage() before anything else', () => {
  for (const file of pages(ROOT)) {
    const src = readFileSync(file, 'utf8');
    const rel = file.slice(ROOT.length);
    assert.match(src, /^import \{ requireAdminPage \} from '@\/lib\/admin\/guard';$/m, `${rel}: import requireAdminPage`);
    const body = src.match(/^export default async function \w+\([^)]*\)\s*\{\r?\n([^\n]*)/m);
    assert.ok(body, `${rel}: the default export must be an async function`);
    assert.equal(body[1].trim(), 'await requireAdminPage();', `${rel}: its first statement must be await requireAdminPage();`);
    assert.doesNotMatch(src, /export (async )?function generateMetadata/, `${rel}: generateMetadata runs outside the guard`);
  }
});

test('the layout uses the same guard', () => {
  const src = readFileSync(join(ROOT, 'layout.js'), 'utf8');
  assert.match(src, /^\s*await requireAdminPage\(\);/m);
});
