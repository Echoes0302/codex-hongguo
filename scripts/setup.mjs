import { spawnSync } from 'node:child_process';
import { mkdir, readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const upstream = JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8'));
const checkout = join(root, '.upstream', 'dsh-hongguo');
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
await mkdir(dirname(checkout), { recursive: true });
let present = true;
try { await access(join(checkout, '.git')); } catch { present = false; }
if (!present) run('git', ['clone', '--no-checkout', '--filter=blob:none', upstream.repository, checkout], root);
const current = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' });
if (!present || current.stdout.trim() !== upstream.revision) {
  const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: checkout, encoding: 'utf8' });
  // A freshly cloned --no-checkout repository reports removed files until checkout.
  if (present && dirty.stdout.trim()) throw new Error('Upstream checkout has local changes; preserve them before updating.');
  run('git', ['fetch', '--depth', '1', 'origin', upstream.revision], checkout);
  run('git', ['checkout', '--detach', upstream.revision], checkout);
}
console.log(`Upstream: frostming/dsh-hongguo @ ${upstream.revision}`);
run(process.execPath, [join(root, 'codex', 'build.mjs')], root);
console.log('Player built locally. Next: npm run install:codex');
