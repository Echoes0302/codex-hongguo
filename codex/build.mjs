import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('.upstream/dsh-hongguo/client.js', root), 'utf8');
const start = source.indexOf("    const h = React.createElement");
const end = source.indexOf('    return {\n      // Only injected services');
if (start < 0 || end < start) throw new Error('Upstream client layout changed');
let player = source.slice(start, end)
  .replace("const API = '/api/hongguo'", "const API = window.HONGGUO_BASE + '/api/hongguo'")
  .replace(/const HISTORY_KEY = '[^']*'/, "const HISTORY_KEY = 'codex.hongguo.history'");
// Upstream returns same-origin playback URLs; the MCP iframe has its own origin.
player = player.replace('      return body\n    }', `      for (const source of body.sources ?? []) {
        if (source.url?.startsWith('/api/hongguo/')) source.url = await window.hongguoMedia(source.url);
      }
      return body\n    }`);
player = player.replace("return h('img', { src: proxied, alt, loading: 'lazy', onError: () => setBroken(true) })",
  "return h(BridgeCover, { src: proxied, alt, onError: () => setBroken(true) })");
await mkdir(new URL('codex/generated/', root), { recursive: true });
await writeFile(new URL('codex/generated/player.js', root),
  `import * as React from 'react';
const fetch = (...args) => window.hongguoFetch(...args);
function BridgeCover({src,alt,onError}){
  const [url,setUrl]=React.useState();
  React.useEffect(()=>{let stopped=false,loaded;
    window.hongguoMedia(src).then(value=>{loaded=value;if(!stopped)setUrl(value)}).catch(()=>{if(!stopped)onError()});
    return()=>{stopped=true;if(loaded?.startsWith('blob:'))URL.revokeObjectURL(loaded)};
  },[src]);
  return url?React.createElement('img',{src:url,alt}):React.createElement('span',{className:'hg-cover-fallback'});
}
` + player + '\nexport { DramaPlayer, CSS, pauseAllDramas };\n');
await build({entryPoints:[fileURLToPath(new URL('codex/widget.jsx', root))], outfile:fileURLToPath(new URL('codex/dist/widget.js', root)),
  bundle:true, format:'iife', platform:'browser', minify:true, define:{'process.env.NODE_ENV':'"production"'}});
