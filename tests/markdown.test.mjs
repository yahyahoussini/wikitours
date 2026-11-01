import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/lib/markdown.js';

describe('renderMarkdown — tables and quotes (2026-11-01: 36 live URLs printed raw pipes)', () => {
  const table = '| Gamme | Chambre | Prix |\n|---|:---:|---:|\n| Économique | Quadruple | voir **cartes** |\n| Premium | Double | — |';

  test('a GFM table becomes <table> with a header row and body rows', () => {
    const html = renderMarkdown(table);
    assert.match(html, /<table><thead><tr><th scope="col">Gamme<\/th><th scope="col">Chambre<\/th><th scope="col">Prix<\/th><\/tr><\/thead>/);
    assert.match(html, /<tbody><tr><td>Économique<\/td><td>Quadruple<\/td><td>voir <strong>cartes<\/strong><\/td><\/tr><tr><td>Premium<\/td><td>Double<\/td><td>—<\/td><\/tr><\/tbody>/);
    assert.doesNotMatch(html, /\|---/);
  });

  test('a lead-in line in the same block stays a paragraph before the table', () => {
    const html = renderMarkdown(`Comparatif des gammes :\n${table}`);
    assert.match(html, /^<p>Comparatif des gammes :<\/p>\n<div class="md-table"><table>/);
  });

  test('Arabic cells and a short row are kept, never shifted', () => {
    const html = renderMarkdown('| المقارنة | التنظيم الرسمي | الوكالات |\n|---|---|---|\n| الإشراف | وزارة الأوقاف |');
    assert.match(html, /<td>الإشراف<\/td><td>وزارة الأوقاف<\/td><td><\/td>/);
  });

  test('cell content is still escaped (no markup injection)', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| <script>x</script> | ok |');
    assert.match(html, /<td>&lt;script&gt;x&lt;\/script&gt;<\/td>/);
    assert.doesNotMatch(html, /<script>/);
  });

  test('pipes inside a sentence are not a table', () => {
    assert.equal(renderMarkdown('Prix | dates | hôtels'), '<p>Prix | dates | hôtels</p>');
  });

  test('a « > » quote becomes a blockquote, not a literal &gt;', () => {
    const html = renderMarkdown('> Les règles sanitaires peuvent changer.\n> Vérifiez avant le départ.');
    assert.equal(html, '<blockquote><p>Les règles sanitaires peuvent changer.<br/>Vérifiez avant le départ.</p></blockquote>');
  });

  test('headings and lists render as before', () => {
    assert.equal(renderMarkdown('## Titre\n\n- un\n- deux'), '<h2>Titre</h2>\n<ul><li>un</li><li>deux</li></ul>');
  });
});

describe('renderMarkdown — lists with indented continuations (the dua post printed « - » and « > »)', () => {
  test('a list item with a nested multi-paragraph quote', () => {
    const md = '- **Entre le coin yéménite et la Pierre Noire**, on récite :\n  > **رَبَّنَا آتِنَا**\n  >\n  > *Rabbanā ātinā…*\n- **Sur le reste du parcours** : toute invocation.';
    const html = renderMarkdown(md);
    assert.equal(html, '<ul><li><strong>Entre le coin yéménite et la Pierre Noire</strong>, on récite :<blockquote><p><strong>رَبَّنَا آتِنَا</strong></p><p><em>Rabbanā ātinā…</em></p></blockquote></li><li><strong>Sur le reste du parcours</strong> : toute invocation.</li></ul>');
  });
  test('a lead-in line, then the list', () => {
    assert.equal(renderMarkdown('Pendant le tawaf :\n- un\n- deux'), '<p>Pendant le tawaf :</p>\n<ul><li>un</li><li>deux</li></ul>');
  });
  test('an ordered list with a second indented line', () => {
    assert.equal(renderMarkdown('1. Ihram\n   au miqat\n2. Tawaf'), '<ol><li>Ihram<br/>au miqat</li><li>Tawaf</li></ol>');
  });
});
