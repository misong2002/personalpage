import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
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
writeFileSync(resolve(root, '_site/.nojekyll'), '');
console.log('Built homepage, language pages, and published PDF catalog in _site/.');
