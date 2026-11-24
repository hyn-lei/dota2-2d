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
const roundTripMs=Number(argument('--rtt-ms')??300),stallMs=Number(argument('--snapshot-stall-ms')??0),stallEvery=Number(argument('--stall-every')??25);
if(!Number.isFinite(roundTripMs)||roundTripMs<0||roundTripMs>4000||!Number.isFinite(stallMs)||stallMs<0||stallMs>2000||!Number.isInteger(stallEvery)||stallEvery<2)throw Error('Use finite RTT/stall values and a stall interval of at least two snapshots');
const source=resolve(argument('--source')||process.cwd()),root=resolve(argument('--root')||process.env.STATIC_ROOT||source);
const {createCoopServer}=await import(pathToFileURL(resolve(source,'server/coop-server.mjs'))),{CoopGame}=await import(pathToFileURL(resolve(source,'server/coop-game.mjs')));
const testGround={x:10000,y:10880};
const timings={step:[],snapshot:[]};
const service=createCoopServer({root,host:'127.0.0.1',port:0,gameFactory(roster,options){
 const game=new CoopGame(roster,{...options,seed:42});
 if(mature){game.time=180;game.nextWave=210;game.nextNeutralSpawn=240;game._spawnCamps();for(let i=0;i<4;i++)game._spawnWave();}
 const start=game.navigation.nearestWalkable(testGround);
 assert.ok(game.navigation.lineClear(start,{x:start.x-450,y:start.y})&&game.navigation.lineClear(start,{x:start.x+450,y:start.y}),'the movement probe needs an unobstructed corridor away from combat');
 Object.assign(game.player,start);game._index();
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
 await page.addInitScript(({roundTripMs,stallMs,stallEvery})=>{
  const Native=window.WebSocket,delay=roundTripMs/2,encoder=new TextEncoder();
  window.WebSocket=class extends Native{
   send(data){setTimeout(()=>{if(this.readyState===Native.OPEN)super.send(data);},delay);}
   set onmessage(handler){
    let deliverAt=0,snapshots=0,timer=null;const queue=[];
    const flush=()=>{
     timer=null;
     while(queue.length&&queue[0].at<=performance.now()){
      const {event,snapshot}=queue.shift();
      if(window.coopSamples?.active&&snapshot)coopSamples.packets.push({at:performance.now(),bytes:encoder.encode(event.data).length,frame:JSON.parse(event.data).frame});
      handler.call(this,event);
     }
     if(queue.length)timer=setTimeout(flush,Math.max(1,queue[0].at-performance.now()));
    };
    super.onmessage=event=>{
     const snapshot=typeof event.data==='string'&&event.data.startsWith('{"type":"snapshot",');
     // A single FIFO consumer preserves WebSocket ordering even when a delayed burst shares a deadline.
     const extra=snapshot&&++snapshots%stallEvery===0?stallMs:0;
     deliverAt=Math.max(deliverAt,performance.now()+delay+extra);queue.push({event,snapshot,at:deliverAt});
     if(timer===null)timer=setTimeout(flush,Math.max(1,deliverAt-performance.now()));
    };
   }
  };
 },{roundTripMs,stallMs,stallEvery});
 await page.goto(`http://127.0.0.1:${service.server.address().port}`,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{
  window.addEventListener('keydown',event=>{
   const samples=window.coopSamples;
   if(event.key!=='ArrowRight'||event.repeat||!samples?.active||samples.inputAt!=null)return;
   // Keep browser input queue delay, excluding driver IPC before the real event.
   samples.inputAt=event.timeStamp;samples.inputReceivedAt=performance.now();
   const p=coopGame.renderView().player;samples.inputPosition={x:p.x,y:p.y};
  },{capture:true});
  const {Renderer}=await import('/src/renderer.js'),{CoopConnection}=await import('/src/coop-connection.js');
  const render=Renderer.prototype.render,request=CoopConnection.prototype.request;
  Renderer.prototype.render=function(game,time){
   const start=performance.now(),shown=game?.renderView?.()||game,result=render.call(this,shown,time);
   if(game?.isNetwork){window.coopGame=game;window.coopRenderer=this;const samples=window.coopSamples;
    if(samples?.active){const now=performance.now(),p=shown.player;samples.frames.push({at:now,x:p.x,y:p.y,inputX:game.lastMovement?.x||0,inputY:game.lastMovement?.y||0,alive:!game.player.dead&&game.player.hp>0,renderMs:now-start});if(samples.inputAt&&samples.firstMoveMs==null&&Math.hypot(p.x-samples.inputPosition.x,p.y-samples.inputPosition.y)>.5)samples.firstMoveMs=now-samples.inputAt;}}
   return result;
  };
  CoopConnection.prototype.request=function(...args){const at=performance.now(),pending=request.apply(this,args);pending.then(result=>{if(window.coopSamples?.active)coopSamples.commands.push({action:args[0],ok:result.ok,reason:result.reason,rttMs:performance.now()-at});});return pending;};
 });
 await page.locator('#quick-coop-room').click();await page.waitForFunction(()=>document.querySelector('#coop-connection')?.textContent.includes('\u5df2\u8fde\u63a5'));
 await page.locator('#coop-name').fill('Performance probe');await page.locator('#coop-create').click();await page.waitForSelector('#coop-room-code');
 await page.locator('#coop-ready').click();await page.locator('#coop-start').click();await page.waitForFunction(()=>window.coopGame?.isNetwork);
 await page.waitForTimeout(1000);timings.active=true;const firstWireBytes=wireBytes();
 await page.evaluate(()=>window.coopSamples={active:true,frames:[],packets:[],commands:[],armedAt:performance.now(),inputAt:null,inputReceivedAt:null,inputPosition:null,firstMoveMs:null});
 for(let i=0;i<5;i++){
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(1000);await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1000);await page.keyboard.up('ArrowLeft');
 }
 const stats=values=>{const a=[...values].sort((x,y)=>x-y);return {n:a.length,mean:a.length?a.reduce((s,n)=>s+n,0)/a.length:0,p50:a[Math.floor(a.length*.5)]||0,p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0};};
 const samples=await page.evaluate(()=>{coopSamples.active=false;return {samples:coopSamples,player:{hp:coopGame.player.hp,maxHp:coopGame.player.maxHp,dead:coopGame.player.dead,statuses:coopGame.player.statuses},frontendBuild:document.querySelector('meta[name="game-build"]')?.content||null,ai:coopGame.entities.filter(e=>e.kind==='hero'&&e.controller==='ai').length,heroes:coopGame.entities.filter(e=>e.kind==='hero').map(e=>e.heroId),entities:coopGame.entities.length,time:coopGame.time};});
 timings.active=false;
 const frames=samples.samples.frames,packets=samples.samples.packets,intervals=a=>a.slice(1).map((v,i)=>v.at-a[i].at),duration=(frames.at(-1).at-frames[0].at)/1000;
 const changed=frames.slice(1).filter((f,i)=>Math.hypot(f.x-frames[i].x,f.y-frames[i].y)>.01).length;
 const backwards=frames.slice(1).map((f,i)=>{const previous=frames[i];return f.inputX===previous.inputX&&f.inputY===previous.inputY?(f.x-previous.x)*f.inputX+(f.y-previous.y)*f.inputY:0;}).filter(d=>d<-.05);
 let plateauAt=null,longestPlateau=0;
 for(let i=1;i<frames.length;i++){
  const f=frames[i],p=frames[i-1],held=f.inputX===p.inputX&&f.inputY===p.inputY&&(f.inputX||f.inputY);
  if(held&&Math.hypot(f.x-p.x,f.y-p.y)<=.01){plateauAt??=p.at;longestPlateau=Math.max(longestPlateau,f.at-plateauAt);}else plateauAt=null;
 }
 const report={label,mature,source,root,frontendBuild:samples.frontendBuild,testGround,simulatedRoundTripMs:roundTripMs,snapshotStallMs:stallMs,stallEvery,ai:samples.ai,heroes:samples.heroes,entities:samples.entities,time:samples.time,player:samples.player,deadFrames:frames.filter(f=>!f.alive).length,failedCommands:samples.samples.commands.filter(c=>!c.ok),durationSeconds:duration,firstVisibleMovementMs:samples.samples.firstMoveMs,positionChangesPerSecond:changed/duration,renderFramesPerSecond:frames.length/duration,longestHeldMovementPlateauMs:longestPlateau,snapshotIntervalsMs:stats(intervals(packets)),decodedPacketBytes:stats(packets.map(p=>p.bytes)),decodedIncomingBytesPerSecond:packets.reduce((s,p)=>s+p.bytes,0)/duration,compressedWebSocketBytesPerSecond:(wireBytes()-firstWireBytes)/duration,commandRoundTripMs:stats(samples.samples.commands.map(c=>c.rttMs)),renderMs:stats(frames.map(f=>f.renderMs)),serverStepMs:stats(timings.step),serverSnapshotMs:stats(timings.snapshot),serverSnapshotCpuMsPerSecond:timings.snapshot.reduce((s,n)=>s+n,0)/duration,errors};
 report.backwardsFrames=backwards.length;report.maxBackwardsDistance=backwards.length?-Math.min(...backwards):0;
 report.transportSequenceErrors=packets.slice(1).filter((packet,i)=>packet.frame<=packets[i].frame).length;
 report.inputDispatchWaitMs=samples.samples.inputAt==null?null:samples.samples.inputAt-samples.samples.armedAt;
 report.inputQueueDelayMs=samples.samples.inputAt==null?null:samples.samples.inputReceivedAt-samples.samples.inputAt;
 report.renderIntervalsMs=stats(intervals(frames));
 report.heldRenderIntervalsMs=stats(frames.slice(1).flatMap((frame,i)=>{const previous=frames[i];return frame.inputX===previous.inputX&&frame.inputY===previous.inputY&&(frame.inputX||frame.inputY)?[frame.at-previous.at]:[];}));
 await writeFile(`artifacts/coop-${label}-samples.json`,JSON.stringify(samples.samples));
 await writeFile(`artifacts/coop-${label}-performance.json`,JSON.stringify(report,null,2));await page.screenshot({path:`artifacts/coop-${label}-performance.png`});console.log(JSON.stringify(report,null,2));
 if(check){
  assert.equal(report.ai,9);if(mature)assert.ok(report.entities>=200);
  assert.ok(!report.player.dead&&report.player.hp>0,'the movement probe must stay alive throughout the measurement');
  assert.equal(report.deadFrames,0,'every measured frame must represent a living movement probe');
  assert.ok(samples.samples.inputAt>=samples.samples.armedAt&&samples.samples.inputAt<=samples.samples.inputReceivedAt,'the browser input event must share the performance clock');
  assert.ok(report.firstVisibleMovementMs!=null&&report.firstVisibleMovementMs<150,'movement must respond before the simulated network round trip');
  assert.ok(report.positionChangesPerSecond>35,'positions must advance on rendered frames, not only on snapshots');
  assert.ok(report.positionChangesPerSecond/report.renderFramesPerSecond>.8,'movement must remain continuous between snapshots');
  assert.ok(report.heldRenderIntervalsMs.max<150,'a changing position must not conceal a long held-movement render stall');
  assert.equal(report.backwardsFrames,0,'server confirmations must not pull movement against an unchanged input in the clear corridor');
  assert.ok(report.snapshotIntervalsMs.p95<275+stallMs,'snapshot transmission must stay within its cadence plus the injected stall');
  if(stallMs){assert.ok(report.snapshotIntervalsMs.max>=stallMs*.9,'the jitter run must contain the configured receive stall');assert.ok(report.longestHeldMovementPlateauMs<75,'short WAN jitter must not visibly freeze a held movement');}
  assert.ok(report.commandRoundTripMs.p50>=roundTripMs*.9,'the test must retain its configured network latency');
  assert.equal(report.transportSequenceErrors,0,'the latency fixture must preserve actual WebSocket frame order');
  assert.equal(samples.samples.commands.filter(c=>!c.ok).length,0);assert.deepEqual(errors,[]);
  console.log('PASS nine-AI movement responsiveness, continuous poses, bounded snapshot pipeline and authoritative command acknowledgements');
 }
}finally{await browser.close();await service.close();}
