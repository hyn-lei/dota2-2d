import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from '../tests/browser-helpers.mjs';

const args=process.argv.slice(2),argument=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const label=args[0]||'current',mature=args.includes('--mature'),check=args.includes('--check');
if(!/^[a-z0-9-]+$/.test(label))throw Error('Use a simple report label');
const source=resolve(argument('--source')||process.cwd()),root=resolve(argument('--root')||process.env.STATIC_ROOT||source);
const {createCoopServer}=await import(pathToFileURL(resolve(source,'server/coop-server.mjs'))),{CoopGame}=await import(pathToFileURL(resolve(source,'server/coop-game.mjs')));
const timings={step:[],snapshot:[]};
const service=createCoopServer({root,host:'127.0.0.1',port:0,gameFactory(roster,options){
 const game=new CoopGame(roster,{...options,seed:42});
 if(mature){game.time=180;game.nextWave=210;game.nextNeutralSpawn=240;game._spawnCamps();for(let i=0;i<4;i++)game._spawnWave();}
 const start=game.navigation.nearestWalkable({x:10400,y:10400});Object.assign(game.player,start);game._index();
 const step=game.step;game.step=function(dt){const at=performance.now();step.call(this,dt);if(timings.active)timings.step.push(performance.now()-at);};return game;
}});
const broadcast=service.manager.broadcastSnapshot;service.manager.broadcastSnapshot=function(room){const at=performance.now();broadcast.call(this,room);if(timings.active)timings.snapshot.push(performance.now()-at);};
const roomDraft=service.manager.roomDraft;service.manager.roomDraft=function(room){room.draftSeed=42;return roomDraft.call(this,room);};
const complete=service.manager.completeSnapshot;service.manager.completeSnapshot=function(...args){const at=performance.now();complete.apply(this,args);if(timings.active)timings.snapshot.push(performance.now()-at);};
await service.listen();await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const wireBytes=()=>[...service.manager.sockets].reduce((n,socket)=>n+(socket._socket?.bytesWritten||0),0);
try{
 await page.addInitScript(()=>{
  const Native=window.WebSocket,delay=150,encoder=new TextEncoder();
  window.WebSocket=class extends Native{
   send(data){setTimeout(()=>{if(this.readyState===Native.OPEN)super.send(data);},delay);}
   set onmessage(handler){super.onmessage=event=>setTimeout(()=>{if(window.coopSamples?.active&&typeof event.data==='string'&&event.data.startsWith('{"type":"snapshot",'))coopSamples.packets.push({at:performance.now(),bytes:encoder.encode(event.data).length});handler.call(this,event);},delay);}
  };
 });
 await page.goto(`http://127.0.0.1:${service.server.address().port}`,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),{CoopConnection}=await import('/src/coop-connection.js');
  const render=Renderer.prototype.render,request=CoopConnection.prototype.request;
  Renderer.prototype.render=function(game,time){
   const start=performance.now(),shown=game?.renderView?.()||game,result=render.call(this,shown,time);
   if(game?.isNetwork){window.coopGame=game;window.coopRenderer=this;const samples=window.coopSamples;
    if(samples?.active){const now=performance.now(),p=shown.player;samples.frames.push({at:now,x:p.x,y:p.y,renderMs:now-start});if(samples.inputAt&&samples.firstMoveMs==null&&Math.hypot(p.x-samples.inputPosition.x,p.y-samples.inputPosition.y)>.5)samples.firstMoveMs=now-samples.inputAt;}}
   return result;
  };
  CoopConnection.prototype.request=function(...args){const at=performance.now(),pending=request.apply(this,args);pending.then(result=>{if(window.coopSamples?.active)coopSamples.commands.push({action:args[0],ok:result.ok,rttMs:performance.now()-at});});return pending;};
 });
 await page.locator('#quick-coop-room').click();await page.waitForFunction(()=>document.querySelector('#coop-connection')?.textContent.includes('\u5df2\u8fde\u63a5'));
 await page.locator('#coop-name').fill('Performance probe');await page.locator('#coop-create').click();await page.waitForSelector('#coop-room-code');
 await page.locator('#coop-ready').click();await page.locator('#coop-start').click();await page.waitForFunction(()=>window.coopGame?.isNetwork);
 await page.waitForTimeout(1000);timings.active=true;const firstWireBytes=wireBytes();
 await page.evaluate(()=>window.coopSamples={active:true,frames:[],packets:[],commands:[],inputAt:performance.now(),inputPosition:{x:coopGame.player.x,y:coopGame.player.y},firstMoveMs:null});
 for(let i=0;i<5;i++){
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(1000);await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1000);await page.keyboard.up('ArrowLeft');
 }
 const stats=values=>{const a=[...values].sort((x,y)=>x-y);return {n:a.length,mean:a.length?a.reduce((s,n)=>s+n,0)/a.length:0,p50:a[Math.floor(a.length*.5)]||0,p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0};};
 const samples=await page.evaluate(()=>{coopSamples.active=false;return {samples:coopSamples,frontendBuild:document.querySelector('meta[name="game-build"]')?.content||null,ai:coopGame.entities.filter(e=>e.kind==='hero'&&e.controller==='ai').length,heroes:coopGame.entities.filter(e=>e.kind==='hero').map(e=>e.heroId),entities:coopGame.entities.length,time:coopGame.time};});
 timings.active=false;
 const frames=samples.samples.frames,packets=samples.samples.packets,intervals=a=>a.slice(1).map((v,i)=>v.at-a[i].at),duration=(frames.at(-1).at-frames[0].at)/1000;
 const changed=frames.slice(1).filter((f,i)=>Math.hypot(f.x-frames[i].x,f.y-frames[i].y)>.01).length;
 const report={label,mature,source,root,frontendBuild:samples.frontendBuild,simulatedRoundTripMs:300,ai:samples.ai,heroes:samples.heroes,entities:samples.entities,time:samples.time,durationSeconds:duration,firstVisibleMovementMs:samples.samples.firstMoveMs,positionChangesPerSecond:changed/duration,renderFramesPerSecond:frames.length/duration,snapshotIntervalsMs:stats(intervals(packets)),decodedPacketBytes:stats(packets.map(p=>p.bytes)),decodedIncomingBytesPerSecond:packets.reduce((s,p)=>s+p.bytes,0)/duration,compressedWebSocketBytesPerSecond:(wireBytes()-firstWireBytes)/duration,commandRoundTripMs:stats(samples.samples.commands.map(c=>c.rttMs)),renderMs:stats(frames.map(f=>f.renderMs)),serverStepMs:stats(timings.step),serverSnapshotMs:stats(timings.snapshot),serverSnapshotCpuMsPerSecond:timings.snapshot.reduce((s,n)=>s+n,0)/duration,errors};
 await writeFile(`artifacts/coop-${label}-performance.json`,JSON.stringify(report,null,2));await page.screenshot({path:`artifacts/coop-${label}-performance.png`});console.log(JSON.stringify(report,null,2));
 if(check){
  assert.equal(report.ai,9);if(mature)assert.ok(report.entities>=200);
  assert.ok(report.firstVisibleMovementMs!=null&&report.firstVisibleMovementMs<150,'movement must respond before the simulated network round trip');
  assert.ok(report.positionChangesPerSecond>35,'positions must advance on rendered frames, not only on snapshots');
  assert.ok(report.positionChangesPerSecond/report.renderFramesPerSecond>.8,'movement must remain continuous between snapshots');
  assert.ok(report.snapshotIntervalsMs.p95<275,'snapshot transmission must not wait for a complete round trip');
  assert.ok(report.commandRoundTripMs.p50>=280,'the test must retain its simulated 300ms latency');
  assert.equal(samples.samples.commands.filter(c=>!c.ok).length,0);assert.deepEqual(errors,[]);
  console.log('PASS nine-AI movement responsiveness, continuous poses, bounded snapshot pipeline and authoritative command acknowledgements');
 }
}finally{await browser.close();await service.close();}
