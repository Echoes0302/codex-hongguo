import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { taskState } from './tasks.mjs';
import { readHistory, saveHistory } from './history.mjs';

const data=process.env.HONGGUO_DATA_DIR || join(homedir(),'.local/share/codex-hongguo');
await mkdir(data,{recursive:true,mode:0o700});
process.env.DSH_PLUGIN_DATA_DIR=data;
const { apply }=await import('../.upstream/dsh-hongguo/index.js');
const routes=[];
const token=randomBytes(24).toString('hex');
let base, origin;
const send=(res,status,body,type='application/json')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store'});res.end(typeof body==='string'?body:JSON.stringify(body))};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>65536)throw new Error('request too large')}return JSON.parse(text)}
const http=createServer(async(req,res)=>{
  try{
    if(req.headers.host!==new URL(origin).host)return send(res,403,{error:'invalid host'});
    const prefix='/'+token;
    const url=new URL(req.url,origin);
    if(!url.pathname.startsWith(prefix+'/'))return send(res,404,{error:'not found'});
    // Random per-process capability URL; only the loopback listener is exposed.
    res.setHeader('access-control-allow-origin','*');
    res.setHeader('access-control-allow-headers','content-type,range');
    if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
    url.pathname=url.pathname.slice(prefix.length);req.url=url.pathname+url.search;
    if(url.pathname==='/codex/tasks')return send(res,200,await taskState(join(data,'tasks'),url.searchParams.get('thread')));
    if(url.pathname==='/codex/history'){
      if(req.method==='POST'){
        const {key,value,removed=[]}=await body(req);
        if(!['codex.hongguo.history','codex.hongguo.history.hongguo'].includes(key))return send(res,400,{error:'invalid key'});
        if(typeof value!=='string'||value.length>50000)return send(res,400,{error:'invalid value'});
        if(!Array.isArray(removed)||removed.length>12||removed.some(id=>typeof id!=='string'))return send(res,400,{error:'invalid removal'});
        await saveHistory(join(data,'history.json'),key,value,removed);
      }
      return send(res,200,await readHistory(join(data,'history.json')));
    }
    if(url.pathname==='/api/hongguo/activity')return send(res,200,{ok:true});
    if(url.pathname==='/')return send(res,200,await html(),'text/html; charset=utf-8');
    const route=routes.filter(r=>url.pathname===r.path||url.pathname.startsWith(r.path+'/')).sort((a,b)=>b.path.length-a.path.length)[0];
    if(route)return await route.handler(req,res);
    send(res,404,{error:'not found'});
  }catch(e){console.error('[hongguo]',e.message);if(!res.headersSent)send(res,500,{error:e.message});else res.end()}
});
await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
origin=`http://127.0.0.1:${http.address().port}`;base=origin+'/'+token;
apply({logger:{info:()=>{},warn:console.error,error:console.error},get:()=>undefined,
  effect:fn=>fn(),inject:(_,fn)=>fn({webServer:{register:route=>{routes.push(route);return()=>routes.splice(routes.indexOf(route),1)}}})});
async function html(){
  const script=await readFile(new URL('./dist/widget.js',import.meta.url),'utf8');
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>摸鱼短剧</title></head><body><div id="root">正在打开摸鱼短剧…</div><script>window.HONGGUO_BASE='+JSON.stringify(base)+';</script><script>'+script.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
}
const server=new McpServer({name:'codex-hongguo',version:'0.2.0'});
const uri='ui://hongguo/player-v4.html';
server.registerResource('hongguo-player',uri,{},async()=>({contents:[{uri,mimeType:'text/html;profile=mcp-app',text:await html(),_meta:{ui:{prefersBorder:false,csp:{connectDomains:[origin],resourceDomains:[origin,'blob:'],frameDomains:[]}},'openai/ui':{availableDisplayModes:['inline','fullscreen'],preferredDisplayMode:'fullscreen'},'openai/widgetCSP':{connect_domains:[origin],resource_domains:[origin,'blob:']}}}]}));
server.registerTool('open_player',{title:'摸鱼短剧',description:'打开摸鱼短剧面板。在 Codex 工作时搜剧、看剧、续播。传入当前 Codex thread ID，可在本轮任务完成时暂停；不传则在所有任务停止时暂停。',inputSchema:{thread_id:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional()},annotations:{readOnlyHint:true,openWorldHint:true},_meta:{ui:{resourceUri:uri},'openai/outputTemplate':uri,'openai/ui':{entrypoints:[{type:'thread'}]}}},async()=>({content:[{type:'text',text:'摸鱼短剧播放器已打开。'}],structuredContent:{ready:true,version:'0.2.0'}}));
server.registerTool('search_dramas',{title:'搜索短剧',description:'按剧名或关键词搜索短剧。',inputSchema:{query:z.string().min(1).max(40)},annotations:{readOnlyHint:true,openWorldHint:true}},async({query})=>{
  const result=await fetch(base+'/api/hongguo/search?q='+encodeURIComponent(query),{signal:AbortSignal.timeout(55000)}).then(r=>r.json());
  return {content:[{type:'text',text:JSON.stringify(result)}],isError:result.ok===false};
});
const appOnly={ui:{visibility:['app']}};
server.registerTool('player_request',{title:'播放器数据',description:'播放器内部数据通道。',inputSchema:{path:z.string().max(4096),method:z.enum(['GET','POST']),body:z.string().max(65536)},_meta:appOnly},async({path,method,body})=>{
  if(!/^\/(api\/hongguo\/(feed|series|search|play|activity)|codex\/(tasks|history))(\?|$)/.test(path))throw new Error('Unsupported player route');
  const res=await fetch(base+path,{method,...(method==='POST'?{body,headers:{'content-type':'application/json'}}:{}),signal:AbortSignal.timeout(120000)});
  return {content:[],_meta:{response:{status:res.status,body:await res.json()}}};
});
server.registerTool('player_read',{title:'播放器媒体',description:'播放器内部媒体分块通道。',inputSchema:{path:z.string().max(8192),offset:z.number().int().min(0),length:z.number().int().min(1).max(512*1024)},_meta:appOnly},async({path,offset,length})=>{
  if(!/^\/api\/hongguo\/(media|cover|stream)\?/.test(path))throw new Error('Unsupported media route');
  const res=await fetch(base+path,{headers:{range:`bytes=${offset}-${offset+length-1}`},signal:AbortSignal.timeout(120000)});
  if(!res.ok)throw new Error('媒体读取失败 '+res.status);
  const bytes=Buffer.from(await res.arrayBuffer());
  const total=Number(res.headers.get('content-range')?.split('/')[1]??bytes.length);
  if(total>64*1024*1024)throw new Error('媒体超过本机播放器大小限制');
  const chunk=res.status===206?bytes:bytes.subarray(offset,offset+length);
  return {content:[],_meta:{media:{data:chunk.toString('base64'),total,mime:res.headers.get('content-type')??'application/octet-stream'}}};
});
if(process.argv.includes('--preview'))console.error('HONGGUO_PREVIEW='+base+'/');
await server.connect(new StdioServerTransport());
process.stdin.on('end',()=>http.close(()=>process.exit(0)));
