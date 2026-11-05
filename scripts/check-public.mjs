import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const list = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
if (list.status !== 0) throw new Error('Run this check from the Git checkout.');
const files = list.stdout.split('\0').filter(Boolean), errors = [];
if (!files.length) throw new Error('No tracked files to inspect. Stage the intended package first.');
const forbidden = /^(?:\.upstream\/|\.local-plugin\/|\.agents\/|node_modules\/|codex\/(?:dist|generated)\/|vendor\/|index\.js$|client\.js$)|(?:^|\/)(?:anonymous|history|profile)\.json$|\.(?:mp4|heic|png)$/i;
for (const file of files) {
  if (forbidden.test(file)) errors.push(`${file}: generated, personal, or upstream content must not be published`);
  const text = await readFile(join(root, file), 'utf8');
  if (/\/Users\/[A-Za-z0-9_.-]+\//.test(text) || /[A-Z]:\\Users\\[A-Za-z0-9_.-]+\\/.test(text)) errors.push(`${file}: personal absolute path`);
  if (/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9]{30,}/.test(text)) errors.push(`${file}: possible credential`);
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Public package check passed (${files.length} tracked files; adapter sources only).`);
