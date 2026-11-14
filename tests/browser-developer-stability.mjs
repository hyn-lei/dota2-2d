import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {createCoopServer} from '../server/coop-server.mjs';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

let service,base=process.env.GAME_URL;
if(!base){service=createCoopServer({root:resolve(process.env.STATIC_ROOT||process.cwd()),host:'127.0.0.1',port:0,autoTick:false});await service.listen();base=`http://127.0.0.1:${service.server.address().port}`;}
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],checks=[],samples=[];
let expectedErrors=0;
page.on('pageerror',e=>{if(e.message==='stability-render-once')expectedErrors++;else errors.push(e.message);});
page.on('dialog',d=>d.accept());
const check=name=>{checks.push(name);console.log('PASS '+name);};
try{
 await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
  Renderer.prototype.render=function(game,time){window.g=game;window.r=this;window.renderCount=(window.renderCount||0)+1;if(window.failOneRender){window.failOneRender=false;throw Error('stability-render-once');}return render.call(this,game,time);};
 });
 await page.locator('[data-hero="axe"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
 await page.locator('.settings-button').click();await page.locator('#developer-mode-settings').scrollIntoViewIfNeeded();
 await page.locator('#developer-mode-toggle').click();await page.locator('#developer-password').fill('821027');await page.locator('#developer-password').press('Enter');
 const ids=await page.evaluate(()=>g.entities.filter(e=>e.kind==='hero').map(e=>e.id));
 for(const id of ids){
  await page.locator('#developer-hero').selectOption(id);await page.locator('#developer-level-max').click();await page.locator('#developer-gold').click();await page.locator('#developer-health').click();await page.locator('#developer-mana').click();
 }
 await page.keyboard.press('Escape');
 const initial=await page.evaluate(async()=>{
  const Items=await import('/src/item-runtime.js'),{createMeta}=await import('/src/inventory.js');
  const bots=g.entities.filter(e=>e.kind==='hero'&&!e.isPlayer);
  for(const h of bots){h.inventory=['moon_shard'];h.inventoryMeta=[createMeta(h,'moon_shard')];g._refreshHero(h);if(!Items.useItem(g,h,0,h).ok)throw Error('Moon Shard was not consumed');}
  // Keep both bases alive so the long-play check cannot finish before the old crash.
  for(const e of g.entities)if(e.kind==='ancient')e.maxHp=e.hp=1e9;
  g.moveTo(10100,11100);return {time:g.time,bots:bots.length,consumed:bots.filter(h=>h.moonShard).length};
 });
 assert.equal(initial.bots,9);assert.equal(initial.consumed,9);
 const end=initial.time+900;
 for(let n=0;n<180;n++){
  samples.push(await page.evaluate(()=>{g.step(5);return {time:g.time,status:g.status,entities:g.entities.length,effects:g.effects.length,pendingSpells:g.pendingSpells.length,renderCount};}));
  await page.waitForTimeout(10);assert.deepEqual(errors,[]);
 }
 assert.ok(samples.at(-1).time>=end);assert.equal(samples.at(-1).status,'playing');
 assert.ok(samples.at(-1).renderCount>samples[0].renderCount+100,'live browser frames must keep running between simulation batches');
 assert.ok(Math.max(...samples.map(s=>s.entities))<600,'units must stay bounded during this fixed 15-minute scenario');
 check('Developer UI upgrades all ten heroes and enables recovery; nine AI consume Moon Shard and the real match, HUD and rendering continue through 15 simulated minutes');

 const before=await page.evaluate(()=>({time:g.time,frames:renderCount}));
 await page.evaluate(()=>window.failOneRender=true);
 await page.waitForFunction(before=>g.time>before.time+.2&&renderCount>before.frames+3,before);
 assert.equal(expectedErrors,1);assert.deepEqual(errors,[]);
 check('An isolated render exception leaves later animation frames scheduled, so the same match resumes without a page refresh');

 await page.keyboard.press('Escape');await page.locator('#back-lobby').click();await page.locator('#resume-game').click();
 await page.waitForFunction(()=>g?.paused&&g.entities.filter(e=>e.kind==='hero'&&!e.isPlayer).every(h=>h.moonShard));
 await page.locator('.modal-primary').click();const resumedAt=await page.evaluate(()=>g.time);
 await page.waitForFunction(t=>g.time>t+.2,resumedAt);assert.deepEqual(errors,[]);
 const developer=await page.evaluate(async()=>(await import('/src/developer-mode.js')).developerModeState(g));assert.equal(developer.enabled,false);
 check('Leaving and resuming the saved long match preserves consumed Moon Shards, keeps developer mode off and continues simulation without freezing');
 await page.screenshot({path:'artifacts/developer-stability.png'});
 await writeFile('artifacts/developer-stability-report.json',JSON.stringify({base,checks,errors,expectedErrors,samples},null,2));
}catch(error){await writeFile('artifacts/developer-stability-report.json',JSON.stringify({base,checks,errors,expectedErrors,samples,error:error.stack},null,2));await page.screenshot({path:'artifacts/developer-stability-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();await service?.close();}
