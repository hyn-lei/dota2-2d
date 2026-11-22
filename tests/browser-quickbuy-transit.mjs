import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const only=process.argv.includes('--scenario')?process.argv[process.argv.indexOf('--scenario')+1]:null;
const browser=await chromium.launch(),errors=[];let page;
try{
 for(const scenario of only?[only]:['leave-shop','courier']){
  page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
  await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.quickTransitGame=g;return render.call(this,g,t);};});
  await page.locator('[data-hero="crystal_maiden"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.quickTransitGame?.time>.1);
  const prepared=await page.evaluate(async scenario=>{
   const g=quickTransitGame,p=g.player,{BASES}=await import('/src/map-data.js'),Courier=await import('/src/courier.js');
   g.entities=[p,g.courier];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=g.nextBuildingCheck=Infinity;p.gold=155;p.speed=0;p.destination=null;p.explicitTarget=null;
   if(scenario==='courier')Object.assign(p,{x:BASES[0].x+600,y:BASES[0].y-1600});
   const queued=g.queueItem('bracer'),bought=g.buyQuick();
   if(scenario==='leave-shop')Object.assign(p,{x:BASES[0].x+600,y:BASES[0].y-1600});
   else{g.courierCommand('deliver');Courier.tickCouriers(g,.1);}
   return {queued:queued.ok,bought:bought.ok,cargo:[...g.courier.cargo]};
  },scenario);
  assert.ok(prepared.queued&&prepared.bought);if(scenario==='courier')assert.ok(prepared.cargo.includes('circlet'));
  await page.waitForTimeout(200);assert.equal(await page.locator('#hud-quickbuy-items [data-hud-buy="circlet"]').count(),0,'an already bought circlet stays out of quickbuy after '+scenario);
  await page.evaluate(()=>quickTransitGame.player.gold=155);await page.locator('#battlefield').focus();await page.keyboard.press('g');await page.waitForTimeout(200);
  const state=await page.evaluate(()=>{const g=quickTransitGame,p=g.player,ids=[...p.inventory,...p.backpack,...p.stash,...g.courier.cargo];return {circlets:ids.filter(id=>id==='circlet').length,gauntlets:ids.filter(id=>id==='gauntlets').length,gold:p.gold};});
  assert.equal(state.circlets,1);assert.equal(state.gauntlets,1);assert.ok(state.gold>15,'G buys the cheaper missing part without buying another circlet');
  console.log('PASS quickbuy '+scenario+' HUD and real G purchase');
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
