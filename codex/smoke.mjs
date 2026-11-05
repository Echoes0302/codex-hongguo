import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const temporaryData = !process.env.HONGGUO_DATA_DIR;
const data = process.env.HONGGUO_DATA_DIR || await mkdtemp(join(tmpdir(), 'hongguo-smoke-'));
const transport=new StdioClientTransport({env: {HONGGUO_DATA_DIR: data}, command:process.execPath,args:[fileURLToPath(new URL('./server.mjs',import.meta.url))],stderr:'pipe'});
transport.stderr?.on('data',data=>process.stderr.write(data));
const client=new Client({name:'hongguo-smoke',version:'1.0.0'});
try {
await client.connect(transport);
const tools=await client.listTools();
assert(tools.tools.some(t=>t.name==='open_player'&&t._meta?.ui?.resourceUri));
const result=await client.callTool({name:'open_player',arguments:{}});
assert(result.structuredContent.ready);
const resource=await client.readResource({uri:'ui://hongguo/player-v4.html'});
const html=resource.contents[0].text;
assert(html.includes('摸鱼短剧'));
const base=JSON.parse(html.match(/window.HONGGUO_BASE=("[^"]+")/)[1]);
await writeFile(join(tmpdir(),'codex-hongguo-preview-url'),base+'/',{mode:0o600});
console.log('MCP handshake, tools, entrypoint and UI resource: PASS');
const state=await client.callTool({name:'player_request',arguments:{path:'/codex/tasks',method:'GET',body:''}});
assert.equal(typeof state._meta.response.body.running,'boolean');
console.log('MCP app data bridge: PASS');
assert.equal((await fetch(new URL(base).origin+'/api/hongguo/feed')).status,404);
const feed=await fetch(base+'/api/hongguo/feed',{signal:AbortSignal.timeout(60000)}).then(r=>r.json());
assert(feed.items?.length,JSON.stringify(feed));
console.log('Live feed:',feed.items.length,'dramas');
const series=await fetch(base+'/api/hongguo/series?id='+feed.items[0].id,{signal:AbortSignal.timeout(60000)}).then(r=>r.json());
assert(series.episodes?.length,JSON.stringify(series));
console.log('Live episodes:',series.episodes.length);
const play=await fetch(base+'/api/hongguo/play?episode='+series.episodes[0].id,{signal:AbortSignal.timeout(60000)}).then(r=>r.json());
assert(play.sources?.length,JSON.stringify(play));
const response=await fetch(base+play.sources[0].url,{headers:{range:'bytes=0-1023'},signal:AbortSignal.timeout(120000)});
assert(response.ok,'media status '+response.status);
const bytes=await response.arrayBuffer();assert(bytes.byteLength>0);
console.log('Live playback:',response.status,bytes.byteLength,'bytes; protected:',play.protected);
const chunk=await client.callTool({name:'player_read',arguments:{path:play.sources[0].url,offset:0,length:1024}});
assert.equal(Buffer.from(chunk._meta.media.data,'base64').length,1024);
console.log('MCP video byte bridge: PASS');
console.log('READY_FOR_BROWSER_QA');
if(process.argv.includes('--keep-open')){
  process.on('SIGINT',async()=>{await client.close();if(temporaryData)await rm(data,{recursive:true,force:true});process.exit(0)});
  await new Promise(()=>{});
}
} finally {
  await client.close();
  if(temporaryData)await rm(data,{recursive:true,force:true});
}
