import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

const url=process.env.GAME_URL||'http://127.0.0.1:5184';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(url,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);await page.locator('[data-hero="weaver"]').click();await page.locator('#difficulty').selectOption('hell');
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.aiGame=g;window.aiRenderer=this;return render.call(this,g,t);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.aiGame?.time>.1);
 const mature=await page.evaluate(()=>{
  const g=aiGame;g.step(180);aiRenderer.followPlayer=false;aiRenderer.lookAt(10000,10000);
  return {difficulty:g.difficulty,time:g.time,status:g.status,entities:g.entities.length,bots:g.entities.filter(h=>h.kind==='hero'&&!h.isPlayer).length,lanes:[0,1].map(team=>[0,1,2].map(lane=>g.entities.filter(h=>h.kind==='hero'&&h.team===team&&h.lane===lane).length))};
 });
 assert.equal(mature.difficulty,'hell');assert.equal(mature.status,'playing');assert.ok(mature.time>=180);assert.equal(mature.bots,9);assert.deepEqual(mature.lanes,[[2,1,2],[2,1,2]]);
 await page.evaluate(()=>{window.aiFrames=[];window.aiMeasure=true;let last;const frame=t=>{if(last!=null)aiFrames.push(t-last);last=t;if(aiMeasure)requestAnimationFrame(frame);};requestAnimationFrame(frame);});
 await page.waitForTimeout(10000);
 const measured=await page.evaluate(()=>{aiMeasure=false;const sorted=aiFrames.sort((a,b)=>a-b),mean=sorted.reduce((n,v)=>n+v,0)/sorted.length,g=aiGame;return {time:g.time,frames:sorted.length,meanFrameMs:mean,p95FrameMs:sorted[Math.floor(sorted.length*.95)],fps:1000/mean,entities:g.entities.length,maxRewindHistory:Math.max(...g.entities.map(e=>e.weaverTimeLapseHistory?.length||0)),heapBytes:performance.memory?.usedJSHeapSize};});
 assert.ok(measured.time>mature.time+5);assert.ok(measured.frames>=200);assert.ok(measured.fps>=28);assert.ok(measured.maxRewindHistory<=64);assert.deepEqual(errors,[]);
 await page.screenshot({path:'artifacts/ai-hell-mature.png'});await writeFile('artifacts/ai-hell-performance.json',JSON.stringify({mature,measured,errors},null,2));console.log(JSON.stringify({mature,measured,errors}));
}finally{await browser.close();}
