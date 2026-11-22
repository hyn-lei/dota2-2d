import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

const base=process.env.GAME_URL||'http://127.0.0.1:5184';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
try{
 await mkdir('artifacts',{recursive:true});
 await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 assert.equal(await page.locator('[data-hero]').count(),10);
 await page.locator('[data-hero="chaos_knight"]').click();
 assert.equal(await page.locator('#lobby-hero-name').textContent(),'混沌骑士');
 assert.ok(await page.locator('#hero-render').evaluate(e=>e.complete&&e.naturalWidth>0));
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.chaosGame=g;return render.call(this,g,t);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.chaosGame?.time>0);
 assert.equal(await page.locator('.ability').count(),4);
 assert.ok(await page.locator('.hud-portrait img').evaluate(e=>e.complete&&e.naturalWidth>0));
 const skillImages=await page.locator('.ability-art>img').evaluateAll(images=>images.map(e=>e.complete&&e.naturalWidth>0));assert.ok(skillImages.every(Boolean));
 for(const type of ['scepter','shard']){
  await page.locator(`[data-hero-upgrade="${type}"]`).hover();
  const text=await page.locator('.hero-upgrade-tooltip').textContent();
  assert.match(text,/混沌骑士/);assert.ok((await page.locator('.hero-upgrade-effects').textContent()).length>20);
  assert.doesNotMatch(text,/%[a-z_]+%/);
 }
 checks.push('10-hero roster, Chaos Knight assets, four abilities and current hero upgrade descriptions');
 await page.mouse.move(300,250);
 const cast=await page.evaluate(()=>{
  const g=window.chaosGame,p=g.player;g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
  for(const e of g.entities.filter(e=>e.kind==='hero')){e.aiTimer=Infinity;e.attackCooldown=9999;e.cooldowns=[9999,9999,9999,9999];e.destination=null;}
  Object.assign(p,{level:25,abilityLevels:[4,4,4,3],cooldowns:[0,0,0,0]});g._refreshHero(p);p.mana=p.maxMana;
  const result=g.cast(3,p);g.step(1);g.paused=true;
  return {result,illusions:g.entities.filter(e=>e.kind==='illusion'&&e.ownerId===p.id).map(e=>({id:e.id,potency:e.itemPotency}))};
 });
 assert.equal(cast.result.ok,true);assert.ok(cast.illusions.length>=3);
 assert.ok(cast.illusions.every(e=>e.potency===100));
 await page.waitForSelector('[data-extra="chaos_knight_armageddon"]');
 assert.ok(await page.locator('[data-extra="chaos_knight_armageddon"] img').evaluate(e=>e.complete&&e.naturalWidth>0));
 assert.ok(await page.locator('[data-owned-unit]').count()>=3);
 checks.push('Real Phantasm creates controllable current-version illusions and exposes Armageddon');
 await page.locator('[data-owned-unit]').first().click();
 await page.waitForFunction(()=>document.querySelector('.game-hud').dataset.unitKind==='illusion');
 assert.match(await page.locator('.illusion-controls>span').textContent(),/幻象/);
 await page.locator('#return-own-hero').click();
 await page.waitForFunction(()=>document.querySelector('.game-hud').dataset.unitKind==='hero');
 const record=await page.evaluate(async()=>{const {serializeMatch,restoreMatch}=await import('/src/game-save.js');const text=serializeMatch(window.chaosGame);const g=restoreMatch(JSON.parse(text));return {hero:g.player.heroId,illusions:g.entities.filter(e=>e.ownerId===g.player.id&&e.kind==='illusion').length};});
 assert.equal(record.hero,'chaos_knight');assert.equal(record.illusions,cast.illusions.length);
 checks.push('Illusion selection, return-to-hero controls and local save restoration');
 await page.screenshot({path:'artifacts/chaos-1366.png'});
 assert.deepEqual(errors,[]);await writeFile('artifacts/chaos-browser-report.json',JSON.stringify({base,checks,cast,record,errors},null,2));
 for(const check of checks)console.log('PASS '+check);
}finally{await browser.close();}
