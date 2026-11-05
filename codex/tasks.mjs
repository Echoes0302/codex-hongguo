import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function taskState(directory,thread){
  const rows=[];
  for(const file of await readdir(directory).catch(()=>[])){
    if(!file.endsWith('.json')||(thread&&file!==thread+'.json'))continue;
    try{const row=JSON.parse(await readFile(join(directory,file),'utf8'));if(Date.now()-row.at<24*3600_000)rows.push(row)}catch{}
  }
  return {running:rows.some(r=>r.running),observed:rows.length>0,sessions:rows.length};
}
