import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const openShop=async()=>{if(!await page.locator('#shop').isVisible())await page.locator('#shop-button').click();};
const closeShop=async()=>{if(await page.locator('#shop').isVisible())await page.locator('#close-shop').click();};
const select=async id=>{await openShop();await page.locator('#item-search').fill(id);await page.locator(`.shop-catalog [data-item="${id}"]`).click();};
const buy=async id=>{await select(id);await page.locator('#buy-selected').click();};
const aim=async offset=>{const at=await page.evaluate(offset=>{const p=window.game.player,r=window.renderer,rect=r.canvas.getBoundingClientRect(),point=r.worldToScreen(p.x+offset,p.y);return {x:rect.x+point.x,y:rect.y+point.y};},offset);await page.mouse.move(at.x,at.y);return at;};
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'networkidle'});
 await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.game=g;window.renderer=this;return render.call(this,g,t);};});
 await page.locator('[data-hero="kunkka"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.game?.time>.1);
 await page.evaluate(()=>{const g=window.game;g.entities=g.entities.filter(e=>e.isPlayer||e.ownerId===g.player.id);g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g.player.gold=100000;g.player.attackCooldown=9999;});
 await buy('blink');await closeShop();
 await page.locator('#inventory [data-slot-area="inventory"][data-slot-index="0"]').dblclick();
 assert.equal(await page.locator('#item-target-prompt').isVisible(),true);
 const before=await page.evaluate(()=>({x:window.game.player.x,y:window.game.player.y})),point=await aim(350);await page.mouse.click(point.x,point.y);
 await page.waitForFunction(()=>!document.querySelector('#item-target-prompt'));
 assert.ok(await page.evaluate(before=>Math.hypot(window.game.player.x-before.x,window.game.player.y-before.y)>200,before));
 assert.ok(await page.evaluate(()=>window.game.itemState(0).cooldown>0));
 console.log('PASS item targeting, blink movement and real cooldown');

 await page.evaluate(async()=>{const {SECRET_SHOPS}=await import('/src/inventory.js');Object.assign(window.game.player,SECRET_SHOPS[0]);window.renderer.center(window.game.player);});
 await buy('dagon');await closeShop();
 await page.evaluate(()=>{const g=window.game,p=g.player,e=g._makeHero('axe',1,1,false,0);Object.assign(e,{x:p.x+250,y:p.y,maxHp:5000,hp:5000,magicResistance:0,armor:0,hpRegen:0,aiTimer:Infinity,attackCooldown:9999,speed:0});g._botTick=()=>{};window.enemy=e;});
 await aim(250);await page.keyboard.press('2');await page.waitForFunction(()=>window.enemy.hp<4990);
 assert.ok(await page.evaluate(()=>window.game.itemState(1).cooldown>0));
 await page.locator('#inventory [data-slot-area="inventory"][data-slot-index="1"]').click();
 assert.equal(await page.locator('#use-selected').isDisabled(),true);
 await page.locator('[data-transfer="backpack"]').click();assert.ok(await page.evaluate(()=>window.game.player.backpackMeta[0].cooldownRemaining>0));
 await page.locator('#inventory [data-slot-area="backpack"][data-slot-index="0"]').click();await page.locator('[data-transfer="inventory"]').click();
 assert.ok(await page.evaluate(()=>window.game.player.inventoryMeta.find(m=>m?.itemId==='dagon').cooldownRemaining>0));
 console.log('PASS targeted item damage and cooldown preservation through backpack');

 await page.evaluate(async()=>{const {BASES}=await import('/src/map-data.js');Object.assign(window.game.player,BASES[0]);window.renderer.center(window.game.player);});
 await buy('power_treads');await closeShop();const strength=await page.evaluate(()=>window.game.player.strength);await page.keyboard.press('3');
 await page.waitForFunction(()=>window.game.player.inventoryMeta[2].mode==='agility');assert.equal(await page.evaluate(()=>window.game.player.strength),strength-10);
 await page.evaluate(()=>{const g=window.game,p=g.player;p.level=12;p.consumedShard=true;g._refreshHero(p);p.mana=p.maxMana;});
 await page.waitForFunction(()=>document.querySelector('[data-extra="kunkka_tidal_wave"]'));
 await aim(300);await page.keyboard.press('d');await page.waitForFunction(()=>window.game.player.extraCooldowns?.kunkka_tidal_wave>0);
 console.log('PASS Power Treads toggle and Kunkka Shard extra-ability shortcut');

 await page.evaluate(async()=>{const {BASES}=await import('/src/map-data.js');const g=window.game;g.entities=g.entities.filter(e=>e.team===0);Object.assign(g.player,{x:BASES[0].x+600,y:BASES[0].y-1600});});
 await buy('gauntlets');assert.ok(await page.evaluate(()=>window.game.player.stash.includes('gauntlets')));await closeShop();await page.keyboard.press('F3');
 await page.evaluate(()=>window.game.step(.2));assert.ok(await page.evaluate(()=>window.game.courier.cargo.includes('gauntlets')));
 await page.evaluate(()=>window.game.step(30));assert.ok(await page.evaluate(()=>window.game.player.inventory.includes('gauntlets')));
 console.log('PASS remote purchase and courier collection, movement and delivery');

 await page.evaluate(async()=>{const {SECRET_SHOPS}=await import('/src/inventory.js');Object.assign(window.game.player,SECRET_SHOPS[0]);window.renderer.center(window.game.player);});
 await buy('perseverance');const slot=await page.evaluate(()=>window.game.player.inventory.indexOf('perseverance'));
 await page.locator(`#inventory [data-slot-area="inventory"][data-slot-index="${slot}"]`).click();await page.locator('#lock-selected').click();assert.ok(await page.evaluate(slot=>window.game.player.inventoryMeta[slot].combineLocked,slot));
 await page.locator('#disassemble-selected').click();assert.ok(await page.evaluate(()=>window.game.player.inventory.includes('healthring')&&window.game.player.inventory.includes('voidstone')));
 const ring=await page.evaluate(()=>window.game.player.inventory.indexOf('healthring'));
 await page.locator(`#inventory [data-slot-area="inventory"][data-slot-index="${ring}"]`).click();await page.locator('#drop-selected').click();await closeShop();
 const drop=await page.evaluate(()=>window.game.entities.find(e=>e.kind==='droppedItem'&&!e.dead).id);
 const floor=await aim(0);await page.mouse.click(floor.x,floor.y,{button:'right'});await page.waitForFunction(id=>window.game.entities.find(e=>e.id===id)?.dead,drop);
 assert.ok(await page.evaluate(()=>window.game.player.inventory.includes('healthring')));
 console.log('PASS combination locking, disassembly, dropping and ground pickup');

 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await openShop();await page.locator('#item-search').fill('');
  await page.screenshot({path:`artifacts/items-and-courier-${width}.png`});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const box=await page.locator('#shop').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await closeShop();
 }
 assert.deepEqual(errors,[]);console.log('PASS desktop/mobile layout and no browser errors');
}finally{await browser.close();}
