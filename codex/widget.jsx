import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import { DramaPlayer, CSS, pauseAllDramas } from './generated/player.js';

const nativeFetch=window.fetch.bind(window);
let app;
let threadId;
const pathOf=url=>String(url).replace(window.HONGGUO_BASE,'');
window.hongguoFetch=async(url,init={})=>{
  if(!app)return nativeFetch(url,init);
  const result=await app.callServerTool({name:'player_request',arguments:{path:pathOf(url),method:init.method??'GET',body:init.body??''}});
  const payload=result._meta?.response;
  if(!payload)throw new Error(result.content?.[0]?.text??'MCP 请求失败');
  return new Response(JSON.stringify(payload.body),{status:payload.status,headers:{'content-type':'application/json'}});
};
const mediaCache=new Map();
window.hongguoMedia=async url=>{
  if(!app)return String(url).startsWith('/api/')?window.HONGGUO_BASE+url:url;
  const path=pathOf(url);
  if(mediaCache.has(path))return mediaCache.get(path);
  const loading=(async()=>{
    const chunkSize=384*1024;
    async function read(offset){
      const result=await app.callServerTool({name:'player_read',arguments:{path,offset,length:chunkSize}});
      const chunk=result._meta?.media;
      if(!chunk)throw new Error(result.content?.[0]?.text??'视频读取失败');
      return {...chunk,bytes:Uint8Array.from(atob(chunk.data),c=>c.charCodeAt(0))};
    }
    const first=await read(0),chunks=[first.bytes];
    for(let offset=chunkSize;offset<first.total;offset+=chunkSize)chunks.push((await read(offset)).bytes);
    const url=URL.createObjectURL(new Blob(chunks,{type:first.mime}));
    const video=!path.startsWith('/api/hongguo/cover');
    const keys=[...mediaCache.keys()].filter(key=>(!key.startsWith('/api/hongguo/cover'))===video);
    while(keys.length>(video?4:100)){
      const old=keys.shift(),promise=mediaCache.get(old);mediaCache.delete(old);
      promise?.then(value=>URL.revokeObjectURL(value)).catch(()=>{});
    }
    return url;
  })();
  mediaCache.set(path,loading);
  try{return await loading}catch(error){mediaCache.delete(path);throw error}
};

const style = document.createElement('style');
style.textContent = CSS + `
:root{color-scheme:light dark;--dsw-alias-label-primary:light-dark(#292724,#eeeae4);--dsw-alias-label-secondary:light-dark(#80796f,#aaa399);--dsw-alias-bg-base:light-dark(#faf8f5,#20201e);--dsw-alias-bg-layer-1:light-dark(#f0ece6,#2a2926);--dsw-alias-bg-layer-2:light-dark(#e7e1d8,#37352f);--dsw-alias-border-l1:light-dark(#ddd6ca,#4b463c);--dsw-alias-brand-primary:#bf6047}
*{box-sizing:border-box}html,body,#root{margin:0;height:100%;min-height:420px}body{font-family:system-ui,-apple-system,sans-serif;background:var(--dsw-alias-bg-base)}
.codex-shell{height:100dvh;min-height:420px;display:flex;flex-direction:column}.codex-status{display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary)}.codex-status span{flex:1}.codex-status label{white-space:nowrap}.hg-root{flex:1}.hg-video{max-height:65vh}
`;
document.head.append(style);

function Shell(){
  const [status,setStatus]=React.useState('摸鱼短剧 · Codex');
  const [auto,setAuto]=React.useState(true);
  React.useEffect(()=>{
    let stopped=false, previous=null, timer;
    async function check(){
      try{
        const res=await window.hongguoFetch(window.HONGGUO_BASE+'/codex/tasks'+(threadId?'?thread='+encodeURIComponent(threadId):''));
        if(!res.ok) throw new Error('offline');
        const next=await res.json();
        if(stopped)return;
        if(previous?.running && !next.running && auto) pauseAllDramas();
        previous=next;
        setStatus(next.running?(threadId?'Agent 正在工作，慢慢看':'有任务进行中，慢慢看'):next.observed?'任务已停，可以继续看':'摸鱼短剧 · 等待任务状态');
      }catch{if(!stopped)setStatus('播放器在线 · 任务状态暂不可用');}
      if(!stopped)timer=setTimeout(check,1500);
    }
    check();return()=>{stopped=true;clearTimeout(timer)};
  },[auto]);
  return <div className="codex-shell"><div className="codex-status"><span>{status}</span><label><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>任务结束暂停</label></div><DramaPlayer/></div>;
}

async function start(){
  if(window.parent!==window){
    app=new App({name:'摸鱼短剧',version:'0.2.0'});
    app.ontoolinput=({arguments:args})=>{threadId=args?.thread_id};
    app.onteardown=async()=>{document.querySelectorAll('video').forEach(v=>v.pause());return {}};
    await app.connect();
  }
  // History lives on the Mac and survives iframe remounts and app restarts.
  const initial=await window.hongguoFetch(window.HONGGUO_BASE+'/codex/history').then(r=>r.json()).catch(()=>({}));
  const history=new Map(Object.entries(initial));
  const storage={getItem:key=>history.get(key)??null,setItem(key,value){
    const previous=JSON.parse(history.get(key)??'{"series":{}}').series??{};
    const next=JSON.parse(value).series??{};
    const removed=Object.keys(previous).filter(id=>!(id in next));
    history.set(key,value);
    window.hongguoFetch(window.HONGGUO_BASE+'/codex/history',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key,value,removed})}).catch(()=>{});
  },removeItem:key=>history.delete(key)};
  Object.defineProperty(window,'localStorage',{value:storage,configurable:true});
  createRoot(document.getElementById('root')).render(<Shell/>);
}
start().catch(e=>{document.getElementById('root').textContent='播放器启动失败：'+e.message});
