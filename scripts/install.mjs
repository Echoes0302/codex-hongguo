import { spawnSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginConfig } from './plugin-config.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const codex = process.env.CODEX_BIN || 'codex';
function run(args) {
  let result;
  if (process.platform === 'win32') {
    const words = [codex, ...args];
    if (words.some(word => /["%!\r\n]/.test(word))) throw new Error('Use an installation path without quotes, percent signs, or exclamation marks on Windows.');
    const command = words.map(word => '"' + word + '"').join(' ');
    result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', '"' + command + '"'], {
      cwd: root, stdio: 'inherit', windowsVerbatimArguments: true,
    });
  } else result = spawnSync(codex, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`codex ${args[0]} failed (${result.status})`);
}
await access(join(root, '.upstream', 'dsh-hongguo', 'index.js'));
await access(join(root, 'codex', 'dist', 'widget.js'));
const ffmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
if (ffmpeg.error || ffmpeg.status !== 0) throw new Error('ffmpeg is required. See the README installation commands.');
const config = pluginConfig(root, process.execPath);
const plugin = join(root, '.local-plugin');
await mkdir(join(plugin, '.codex-plugin'), { recursive: true });
await mkdir(join(plugin, 'hooks'), { recursive: true });
await mkdir(join(root, '.agents', 'plugins'), { recursive: true });
const json = value => JSON.stringify(value, null, 2) + '\n';
await writeFile(join(plugin, '.codex-plugin', 'plugin.json'), json(config.manifest));
await writeFile(join(plugin, '.mcp.json'), json(config.mcp));
await writeFile(join(plugin, 'hooks', 'hooks.json'), json(config.hooks));
await writeFile(join(root, '.agents', 'plugins', 'marketplace.json'), json({
  name: 'hongguo-local', interface: { displayName: '摸鱼短剧（本机）' },
  plugins: [{ name: 'codex-hongguo', source: { source: 'local', path: './.local-plugin' },
    policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }],
}));
if (process.argv.includes('--generate-only')) {
  console.log('Local plugin configuration generated; Codex settings were not changed.');
} else {
  run(['plugin', 'marketplace', 'add', root]);
  run(['plugin', 'add', 'codex-hongguo@hongguo-local']);
  console.log('Installed. Start a new Codex chat, review the five plugin hooks, then ask to open 摸鱼短剧.');
}
