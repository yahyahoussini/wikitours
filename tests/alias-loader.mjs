// Node ESM hooks so plain `node --test` can import the app's modules: the
// `@/` alias (jsconfig.json → ./src), extensionless imports (Next resolves
// `@/lib/months`; bare Node needs `months.js`) and the JSON dictionaries
// `src/lib/i18n.js` imports without an import attribute.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SRC = new URL('../src/', import.meta.url);
const EXTENSIONS = ['', '.js', '.jsx', '.mjs', '/index.js'];

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const base = new URL(specifier.slice(2), SRC).href;
    const found = EXTENSIONS.map((ext) => base + ext).find((candidate) => existsSync(new URL(candidate)) && !candidate.endsWith('/'));
    return next(found ?? base, context);
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith('file:') && url.endsWith('.json')) {
    const source = await readFile(new URL(url), 'utf8');
    return { format: 'module', source: `export default ${source};`, shortCircuit: true };
  }
  return next(url, context);
}
