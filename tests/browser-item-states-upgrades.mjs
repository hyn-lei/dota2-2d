import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

const base=process.env.GAME_URL||'http://127.0.0.1:5184';
const only=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',d=>d.accept());
const cases={
 async world(){
  await page.evaluate(()=>window.stateGame.paused=false);
  await page.locator('#defense-glyph').click();
  await page.waitForFunction(()=>window.stateGame.glyphStates[0].rechargeAt.length===1);
  assert.equal(await page.locator('#defense-glyph').isDisabled(),true);
  const gate=await page.evaluate(()=>{
   const g=window.stateGame,o=g.worldObjectives.find(e=>e.objectiveType==='gate');g.paused=true;
   Object.assign(g.player,{x:o.x+100,y:o.y,destination:null,explicitTarget:null,targetId:null});
   g.entities=[g.player];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g._index();
   window.stateRenderer.lookAt(o.x,o.y);return {id:o.id,...window.stateRenderer.worldToScreen(o.x,o.y)};
  });
  await page.evaluate(()=>window.stateGame.paused=false);
  await page.mouse.click(gate.x,gate.y,{button:'right'});
  await page.waitForFunction(id=>window.stateGame.player.worldInteraction?.objectiveId===id,gate.id);
  const moved=await page.evaluate(id=>{const g=window.stateGame;g.step(3.1);g.paused=true;const destination=g.worldObjectives.find(o=>o.objectiveType==='gate'&&o.id!==id);return {x:g.player.x,y:g.player.y,destination:{x:destination.x,y:destination.y},interaction:g.player.worldInteraction};},gate.id);
  assert.equal(moved.interaction,undefined);
  assert.ok(Math.hypot(moved.destination.x-moved.x,moved.destination.y-moved.y)<300);
 },
 async neutral(){
  await page.locator('#shop-button').click();
  await page.locator('[data-category="neutral"]').waitFor({timeout:6000});
  await page.locator('[data-category="neutral"]').click();
  assert.equal(await page.locator('[data-neutral-tier]').count(),4);
  assert.equal(await page.locator('[data-neutral-artifact]').count(),4);
  await page.evaluate(()=>{window.stateGame.player.madstone=6;window.stateGame.paused=false;});
  await page.waitForFunction(()=>!document.querySelector('[data-craft-neutral]').disabled);
  const artifact=await page.locator('[data-neutral-artifact]').nth(1).getAttribute('data-neutral-artifact');
  await page.locator('[data-neutral-artifact]').nth(1).click();
  await page.locator('[data-craft-neutral]').click();
  await page.waitForFunction(id=>window.stateGame.player.neutralItem===id,artifact);
  await page.evaluate(()=>window.stateGame.paused=true);
  assert.equal(await page.evaluate(()=>window.stateGame.player.madstone),0);
  assert.equal(await page.locator('[data-neutral-slot="artifact"] img').count(),1);
  assert.equal(await page.locator('[data-neutral-slot="enchantment"] img').count(),1);
  assert.equal(await page.locator('[data-craft-neutral]').isDisabled(),true);
  assert.match(await page.locator('.neutral-craft-status').textContent(),/15:00/);
  await page.locator('[data-neutral-tier="4"]').click();
  assert.equal(await page.locator('[data-neutral-artifact]').count(),4);
  assert.match(await page.locator('.neutral-craft-status').textContent(),/50:00/);
 },
 async upgrades(){
  const scepter=page.locator('[data-hero-upgrade="scepter"]'),shard=page.locator('[data-hero-upgrade="shard"]');
  await scepter.waitFor({timeout:6000});
  assert.equal(await scepter.getAttribute('data-upgrade-state'),'missing');
  await scepter.hover();
  await page.locator('.hero-upgrade-tooltip:not([hidden])').waitFor();
  assert.match(await page.locator('.hero-upgrade-tooltip').textContent(),/剑圣.*阿哈利姆神杖.*未获得/s);
  const effect=await page.locator('.hero-upgrade-effects').textContent();
  assert.ok(effect.length>15,'hero-specific upgrade effect is available before purchase');
  await page.evaluate(async()=>{
   const g=window.stateGame,p=g.player,{createMeta}=await import('/src/inventory.js');
   p.inventory[0]='ultimate_scepter';p.inventoryMeta[0]=createMeta(p,'ultimate_scepter');g._refreshHero(p);
  });
  await page.waitForFunction(()=>document.querySelector('[data-hero-upgrade="scepter"]').dataset.upgradeState==='active');
  await page.evaluate(()=>{const g=window.stateGame;const result=window.stateAction(()=>g.moveItem('inventory',0,'backpack',0));if(!result.ok)throw Error(result.reason);});
  await page.waitForFunction(()=>document.querySelector('[data-hero-upgrade="scepter"]').dataset.upgradeState==='inactive');
  await scepter.hover();assert.match(await page.locator('.hero-upgrade-tooltip').textContent(),/背包/);
  await page.evaluate(()=>{const g=window.stateGame,p=g.player;p.consumedScepter=true;p.consumedShard=true;g._refreshHero(p);});
  await page.waitForFunction(()=>document.querySelector('[data-hero-upgrade="shard"]').dataset.upgradeState==='active');
  await shard.hover();assert.match(await page.locator('.hero-upgrade-tooltip').textContent(),/阿哈利姆魔晶.*已生效/s);
  await page.evaluate(()=>{const g=window.stateGame;const e=g.entities.find(e=>e.team===1&&e.heroId!==g.player.heroId);g.selectEntity(e.id);});
  await page.waitForFunction(()=>document.querySelector('[data-hero-upgrade="scepter"]').dataset.heroId!==window.stateGame.player.heroId);
  await scepter.hover();assert.ok(!(await page.locator('.hero-upgrade-tooltip').textContent()).startsWith('剑圣'));
  await page.evaluate(()=>window.stateGame.selectEntity(window.stateGame.player.id));
 },
 async treads(){
  await page.evaluate(async()=>{const g=window.stateGame,p=g.player,{createMeta}=await import('/src/inventory.js');p.inventory[1]='power_treads';p.inventoryMeta[1]=createMeta(p,'power_treads');g._refreshHero(p);});
  const slot=page.locator('.equipped-slots [data-slot-index="1"]');
  await page.waitForFunction(()=>document.querySelector('.equipped-slots [data-slot-index="1"]').dataset.itemMode==='strength');
  const colors=[];
  for(const mode of ['strength','agility','intelligence']){
   await page.waitForFunction(m=>document.querySelector('.equipped-slots [data-slot-index="1"]').dataset.itemMode===m,mode);
   colors.push(await slot.evaluate(e=>getComputedStyle(e).borderColor));
   const image=await slot.locator('img').evaluate(e=>({loaded:e.complete&&e.naturalWidth>0,src:e.getAttribute('src')}));
   assert.ok(image.loaded);assert.match(image.src,new RegExp(`power_treads_${{strength:'str',agility:'agi',intelligence:'int'}[mode]}\\.png`));
   const result=await page.evaluate(()=>window.stateAction(()=>window.stateGame.useItem(1)));assert.equal(result.ok,true);
  }
  assert.equal(new Set(colors).size,3,'all attributes visibly differ');
 },
 async armlet(){
  await page.evaluate(async()=>{const g=window.stateGame,p=g.player,{createMeta}=await import('/src/inventory.js');p.inventory[2]='armlet';p.inventoryMeta[2]=createMeta(p,'armlet');g._refreshHero(p);});
  const slot=page.locator('.equipped-slots [data-slot-index="2"]');
  await page.waitForFunction(()=>document.querySelector('.equipped-slots [data-slot-index="2"]').dataset.itemMode==='off');
  const before=await slot.evaluate(e=>getComputedStyle(e).borderColor);
  assert.equal((await page.evaluate(()=>window.stateAction(()=>window.stateGame.useItem(2)))).ok,true);
  await page.waitForFunction(()=>document.querySelector('.equipped-slots [data-slot-index="2"]').dataset.itemMode==='on');
  assert.match(await slot.locator('img').getAttribute('src'),/armlet_active\.png/);
  assert.notEqual(await slot.evaluate(e=>getComputedStyle(e).borderColor),before);
  assert.match(await slot.getAttribute('aria-label'),/开启/);
 },
 async layout(){
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   await page.mouse.move(200,200);
   for(const selector of ['[data-hero-upgrade="scepter"]','[data-hero-upgrade="shard"]','.equipped-slots','.tp-slot']){
    const r=await page.locator(selector).boundingBox();assert.ok(r&&r.width>12&&r.height>12&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,`${selector} visible at ${viewport.width}`);
   }
   const health=await page.locator('.vital-bar.health').boundingBox(),upgrade=await page.locator('[data-hero-upgrade="scepter"]').boundingBox();
   assert.ok(upgrade.x+upgrade.width<=health.x||upgrade.x>=health.x+health.width||upgrade.y+upgrade.height<=health.y||upgrade.y>=health.y+health.height,'upgrade controls do not cover health');
   await page.locator('[data-hero-upgrade="scepter"]').click();
   const r=await page.locator('.hero-upgrade-tooltip:not([hidden])').boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1);
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.screenshot({path:`artifacts/item-upgrades-${viewport.width}.png`});
  }
 }
};
try{
 await mkdir('artifacts',{recursive:true});
 for(const [name,run]of Object.entries(cases))if(!only||only===name){
  await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
  await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.stateGame=g;window.stateRenderer=this;return render.call(this,g,t);};});
  await page.locator('[data-hero="juggernaut"]').click();await page.locator('#start-game').click();
  await page.waitForFunction(()=>window.stateGame?.time>0);
  await page.evaluate(()=>{const g=window.stateGame;g.paused=true;g.player.gold=20000;window.stateAction=action=>{g.paused=false;try{return action();}finally{g.paused=true;}};});
  await run();checks.push(name);console.log(`PASS ${name}`);
 }
 assert.deepEqual(errors,[]);
 await writeFile('artifacts/item-upgrades-report.json',JSON.stringify({base,checks,errors},null,2));
}finally{await browser.close();}
