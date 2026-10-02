import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { generateCatalog } from './pdf-catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const configured = process.env.QUARTO_PATH || 'quarto';
const command = process.platform === 'win32' ? configured.replace(/\.cmd$/i, '.exe') : configured;
function render(cwd) {
  const result = spawnSync(command, ['render', '--to', 'html'], {
    cwd, stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const output = resolve(root, '_site');
generateCatalog(root);
// Only delete generated output at the verified project-local destination.
if (output !== resolve(root, './_site') || !output.startsWith(root)) throw new Error('Invalid output directory');
console.log(`Cleaning generated output: ${output}`);
rmSync(output, { recursive: true, force: true });
render(root);
// Changed assets get new URLs so a cached script cannot overwrite fresh page text.
const versions = Object.fromEntries(['styles.css', 'languages.js'].map(name => [
  name, createHash('sha256').update(readFileSync(resolve(output, 'assets', name))).digest('hex').slice(0, 12)
]));
function versionAssets(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) versionAssets(path);
    else if (entry.name.endsWith('.html')) {
      const html = readFileSync(path, 'utf8').replace(/assets\/(styles\.css|languages\.js)(?=["'])/g,
        (_, name) => `assets/${name}?v=${versions[name]}`);
      writeFileSync(path, html);
    }
  }
}
versionAssets(output);
writeFileSync(resolve(root, '_site/.nojekyll'), '');
console.log('Built homepage, language pages, and published PDF catalog in _site/.');
