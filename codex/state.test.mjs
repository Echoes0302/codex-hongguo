import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readHistory,saveHistory} from './history.mjs';
import {taskState} from './tasks.mjs';

test('simultaneous panels retain each drama and reject old playback progress',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'hongguo-history-')),file=join(dir,'history.json'),key='codex.hongguo.history.hongguo';
  try{
    await Promise.all(Array.from({length:8},(_,i)=>saveHistory(file,key,JSON.stringify({series:{['s'+i]:{at:i,position:i}}}))));
    assert.equal(Object.keys(JSON.parse((await readHistory(file))[key]).series).length,8);
    await saveHistory(file,key,JSON.stringify({series:{s7:{at:1,position:0}}}));
    assert.equal(JSON.parse((await readHistory(file))[key]).series.s7.position,7);
    await saveHistory(file,key,JSON.stringify({series:{}}),['s0']);
    assert(!JSON.parse((await readHistory(file))[key]).series.s0);
  }finally{await rm(dir,{recursive:true})}
});

test('one chat finishing does not depend on another chat still running',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'hongguo-tasks-'));
  try{
    await writeFile(join(dir,'one.json'),JSON.stringify({running:false,at:Date.now()}));
    await writeFile(join(dir,'two.json'),JSON.stringify({running:true,at:Date.now()}));
    assert.equal((await taskState(dir)).running,true);
    assert.equal((await taskState(dir,'one')).running,false);
    assert.equal((await taskState(dir,'two')).running,true);
  }finally{await rm(dir,{recursive:true})}
});
