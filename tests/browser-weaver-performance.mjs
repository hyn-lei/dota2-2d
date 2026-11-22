import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184/',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.locator('[data-hero="weaver"]').click();
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.weaverGame=g;window.weaverRenderer=this;return render.call(this,g,t);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.weaverGame?.time>.1);
 const mature=await page.evaluate(()=>{
  const g=window.weaverGame,p=g.player;p.abilityLevels=[4,4,4,3];p.consumedShard=true;p.consumedScepter=true;g._refreshHero(p);
  let maxBeetles=0;
  for(let i=0;i<3600&&g.status==='playing';i++){
   p.mana=p.maxMana;
   if(i%120===0)g.cast(1);
   if(i%400===0)g.cast(0,{x:p.x+3000,y:p.y});
   g.step(.05);maxBeetles=Math.max(maxBeetles,g.entities.filter(e=>e.kind==='weaverBeetle'&&!e.dead).length);
  }
  window.weaverRenderer.followPlayer=false;window.weaverRenderer.lookAt(10000,10000);
  return {time:g.time,status:g.status,bots:g.entities.filter(e=>e.kind==='hero'&&!e.isPlayer).length,entities:g.entities.length,maxBeetles,maxHistory:Math.max(...g.entities.map(e=>e.weaverTimeLapseHistory?.length||0))};
 });
 assert.ok(mature.time>=180);assert.equal(mature.status,'playing');assert.equal(mature.bots,9);assert.ok(mature.maxHistory<=64);
 await page.evaluate(()=>{window.frameIntervals=[];window.frameMeasure=true;let last;const frame=t=>{if(last!=null)frameIntervals.push(t-last);last=t;if(frameMeasure)requestAnimationFrame(frame);};requestAnimationFrame(frame);});
 await page.waitForTimeout(10000);
 const measured=await page.evaluate(()=>{window.frameMeasure=false;const values=frameIntervals.sort((a,b)=>a-b),mean=values.reduce((sum,v)=>sum+v,0)/values.length,g=weaverGame;return {time:g.time,frames:values.length,meanFrameMs:mean,p95FrameMs:values[Math.floor(values.length*.95)],fps:1000/mean,entities:g.entities.length,maxHistory:Math.max(...g.entities.map(e=>e.weaverTimeLapseHistory?.length||0)),heapBytes:performance.memory?.usedJSHeapSize};});
 assert.ok(measured.time>mature.time+5);assert.ok(measured.frames>=200);assert.ok(measured.fps>=28);assert.ok(measured.maxHistory<=64);assert.deepEqual(errors,[]);
 await page.screenshot({path:'artifacts/weaver-mature-performance.png'});await writeFile('artifacts/weaver-performance.json',JSON.stringify({mature,measured,errors},null,2));console.log(JSON.stringify({mature,measured,errors}));
}finally{await browser.close();}
