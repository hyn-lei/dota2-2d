import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
const check=s=>{checks.push(s);console.log('PASS '+s);};page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await mkdir('artifacts',{recursive:true});
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5193',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};});
 await page.locator('[data-hero="crystal_maiden"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
 await page.evaluate(()=>{const p=g.player,c=g.courier;g.entities=[p,c];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=1e9;g._heroTick=()=>{};Object.assign(p,{x:10400,y:10400,gold:10000,quickbuy:['magic_stick','gauntlets']});});
 await page.waitForSelector('[data-hud-buy="magic_stick"]');assert.equal(await page.locator('#shop').isVisible(),false);
 const gold=await page.evaluate(()=>g.player.gold);await page.locator('[data-hud-buy="magic_stick"]').click();await page.waitForFunction(()=>g.player.stash.includes('magic_stick'));assert.ok(await page.evaluate(before=>g.player.gold<before,gold));assert.equal(await page.locator('#shop').isVisible(),false);
 await page.locator('[data-hud-buy="gauntlets"]').click({button:'right'});await page.waitForFunction(()=>g.player.stash.includes('gauntlets'));assert.equal(await page.locator('#shop').isVisible(),false);
 await page.evaluate(()=>g.player.quickbuy=['armlet']);await page.waitForSelector('[data-hud-buy="helm_of_iron_will"]');assert.equal(await page.locator('[data-hud-buy="armlet"]').count(),0);await page.locator('[data-hud-buy="helm_of_iron_will"]').click();await page.waitForFunction(()=>g.player.stash.includes('helm_of_iron_will'));
 check('HUD quickbuy left/right-click purchases directly with shop closed; composite queues show missing components');
 await page.evaluate(async()=>{const {createMeta}=await import('/src/inventory.js');const ids=['armlet','black_king_bar','blink','dagon','magic_wand','tpscroll'];g.player.stash=ids;g.player.stashMeta=ids.map(id=>createMeta(g.player,id));g.courier.cargo=ids;g.courier.cargoMeta=ids.map(id=>createMeta(g.player,id));});
 await page.locator('#shop-button').click();await page.waitForFunction(()=>document.querySelectorAll('.stash-slots img').length===6&&document.querySelectorAll('.courier-cargo img').length===6);
 for(const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  const shopButton=await page.locator('#shop-button').boundingBox();assert.ok(shopButton.width>= (viewport.width>700?186:126));assert.ok(shopButton.height>=(viewport.width>700?44:30));
  assert.ok(await page.locator('#hud-quickbuy-items').isVisible());
  await page.waitForFunction(()=>[...document.querySelectorAll('.stash-slots img,.courier-cargo img')].every(i=>i.complete&&i.naturalWidth>0));
  const ratios=await page.locator('.stash-slots .inventory-slot,.courier-cargo>span').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect(),i=b.querySelector('img');return {ratio:r.width/r.height,fit:getComputedStyle(i).objectFit,w:r.width,h:r.height};}));assert.equal(ratios.length,12);for(const r of ratios){assert.ok(Math.abs(r.ratio-88/64)<.025,JSON.stringify(r));assert.equal(r.fit,'contain');assert.ok(r.h>=30);}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.stash-section').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/economy-shop-${viewport.width}.png`});
  await page.locator('#close-shop').click();await page.screenshot({path:`artifacts/economy-hud-${viewport.width}.png`});await page.locator('#shop-button').click();
 }
 check('Large shop button, visible quickbuy, and complete stash/courier icons retain 88:64 proportions on desktop/laptop/mobile');
 await page.setViewportSize({width:1366,height:768});await page.locator('#close-shop').click();
 const before=await page.evaluate(async()=>{const {createMeta}=await import('/src/inventory.js');const p=g.player;p.inventory=['armlet'];p.inventoryMeta=[createMeta(p,'armlet')];g._refreshHero(p);p.hp=100;window.armletBase=p.maxHp;g.useItem(0,p);return p.maxHp;});
 await page.waitForFunction(()=>g.player.inventoryMeta[0].armletStrength===25);await page.evaluate(()=>g.paused=true);await page.waitForFunction(()=>document.querySelector('#hp-label').textContent.endsWith(' / '+g.player.maxHp));assert.equal(await page.evaluate(()=>g.player.maxHp),before+550);assert.ok(await page.evaluate(()=>g.player.hp>500));await page.waitForSelector('[data-status-id="armletUnholy"]');
 check('Armlet ramp visibly adds current/max HP in the live HUD and exposes Unholy Strength status');
 assert.deepEqual(errors,[]);await writeFile('artifacts/economy-report.json',JSON.stringify({checks,errors},null,2)+'\n');
}finally{await browser.close();}
