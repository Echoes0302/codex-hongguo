import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPlayerModule } from './transform.mjs';

test('Windows CRLF and Unix LF upstream checkouts build the same player', async () => {
  const upstream = await readFile(new URL('../.upstream/dsh-hongguo/client.js', import.meta.url), 'utf8');
  const lf = upstream.replace(/\r\n?/g, '\n');
  const player = createPlayerModule(lf);
  assert.equal(createPlayerModule(lf.replace(/\n/g, '\r\n')), player);
  assert(player.includes('await window.hongguoMedia(source.url)'));
  assert(player.includes('export { DramaPlayer, CSS, pauseAllDramas }'));
});
