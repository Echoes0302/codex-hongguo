import { readFile, writeFile, rename } from 'node:fs/promises';
import lockfile from 'proper-lockfile';
export async function readHistory(file){
  try{return JSON.parse(await readFile(file,'utf8'))}catch(error){if(error.code==='ENOENT')return {};throw error}
}
export async function saveHistory(file,key,value,removed=[]){
  const release=await lockfile.lock(file,{realpath:false,retries:{retries:20,minTimeout:10,maxTimeout:100}});
  try{
    const history=await readHistory(file);
    const rows=JSON.parse(history[key]??'{"series":{}}').series??{};
    for(const [id,row] of Object.entries(JSON.parse(value).series??{})){
      if(!rows[id]||Number(row.at)>=Number(rows[id].at))rows[id]=row;
    }
    for(const id of removed)delete rows[id];
    history[key]=JSON.stringify({series:Object.fromEntries(Object.entries(rows).sort((a,b)=>Number(b[1].at)-Number(a[1].at)).slice(0,12))});
    const temp=file+'.'+process.pid+'.tmp';
    await writeFile(temp,JSON.stringify(history),{mode:0o600});await rename(temp,file);
    return history;
  }finally{await release()}
}
