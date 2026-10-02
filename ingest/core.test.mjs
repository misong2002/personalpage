import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanMarkdown, lintMarkdown, makeQmd, parseModelJson } from './core.mjs';
test('draft frontmatter and executable chunks cannot override render configuration', () => {
  const md = cleanMarkdown('---\nfilters: evil.lua\n---\n\n```{python}\nprint(1)\n```');
  assert.ok(!md.includes('evil.lua'));
  assert.ok(md.includes('```text'));
  assert.ok(makeQmd('Title\nfilters: bad.lua', md).startsWith('---\ntitle: "Title\\nfilters: bad.lua"'));
});
test('valid equations pass but unmatched delimiters fail', () => {
  assert.deepEqual(lintMarkdown('Value $x$ and\n$$\nx=1\n$$ {#eq-one}\nSee @eq-one').errors, []);
  assert.ok(lintMarkdown('$x and $$y$$').errors.length);
  assert.ok(lintMarkdown('$$x').errors.length);
});
test('dangerous inclusions block compilation', () => {
  assert.ok(lintMarkdown('{{< include ../.env >}}').errors.length);
  assert.ok(lintMarkdown('<script>alert(1)</script>').errors.length);
  assert.ok(lintMarkdown('![secret](../.env)').errors.length);
});
test('duplicate labels and mismatched environments are errors', () => {
  assert.ok(lintMarkdown('{#eq-one} {#eq-one}').errors.length);
  assert.ok(lintMarkdown('\\begin{align}x\\end{equation}').errors.length);
});
test('cross-chapter references are warnings and uncertainty stays visible', () => {
  const report = lintMarkdown('See @eq-other. [UNCLEAR: index]');
  assert.equal(report.errors.length, 0);
  assert.equal(report.warnings.length, 2);
});
test('model responses must parse as JSON', () => {
  assert.deepEqual(parseModelJson('```json\n{"markdown":"$x$"}\n```'), { markdown: '$x$' });
  assert.throws(() => parseModelJson('not json'));
});
