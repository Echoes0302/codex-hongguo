import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createPlayerModule } from './transform.mjs';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('.upstream/dsh-hongguo/client.js', root), 'utf8');
await mkdir(new URL('codex/generated/', root), { recursive: true });
await writeFile(new URL('codex/generated/player.js', root), createPlayerModule(source));
await build({entryPoints:[fileURLToPath(new URL('codex/widget.jsx', root))], outfile:fileURLToPath(new URL('codex/dist/widget.js', root)),
  bundle:true, format:'iife', platform:'browser', minify:true, define:{'process.env.NODE_ENV':'"production"'}});
