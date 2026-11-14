import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
import {ITEMS} from '../src/item-data.js';
import {SHOP_GROUPS} from '../src/shop-layout.js';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],checks=[];
const check=s=>{checks.push(s);console.log('PASS '+s);};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
await mkdir('artifacts',{recursive:true});
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};});
 await page.locator('[data-hero="drow_ranger"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
 await page.evaluate(async()=>{
  const g=window.g,p=g.player,{createMeta}=await import('/src/inventory.js'),{addStatus}=await import('/src/hero-runtime.js');
  g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
  for(const e of g.entities.filter(e=>e.kind==='hero'))Object.assign(e,{aiTimer:Infinity,destination:null,explicitTarget:null,x:10400+(e.team?2000:0),y:10400,attackCooldown:999});
  Object.assign(p,{gold:10000,abilityLevels:[4,4,4,3],cooldowns:[0,0,0,0],skillPoints:0,talentPoints:1,level:10});
  const ally=g.entities.find(e=>e.team===p.team&&e.id!==p.id),enemy=g.entities.find(e=>e.team!==p.team&&e.kind==='hero');
  for(const e of [ally,enemy]){Object.assign(e,{hp:321,maxHp:900,mana:111,maxMana:500,abilityLevels:[1,2,3,1],cooldowns:[9,0,0,0],skillPoints:2,talentPoints:1,level:15,talents:[0]});e.inventory=['magic_wand'];e.inventoryMeta=[createMeta(e,'magic_wand',{charges:7})];e.itemCooldowns={magic_wand:8};addStatus(g,e,'ogreBloodlust',{name:'嗜血术',positive:true,duration:30});}
  window.allyId=ally.id;window.enemyId=enemy.id;g.paused=true;
 });
 const location=await page.locator('.hud-portrait').boundingBox();
 for(const id of await page.evaluate(()=>window.g.entities.filter(e=>e.kind==='hero').map(e=>e.id))){
  await page.locator(`[data-inspect-hero="${id}"]`).click();
  await page.waitForFunction(id=>document.querySelector('.game-hud').dataset.unitId===id,id);
  assert.deepEqual(await page.locator('.hud-portrait').boundingBox(),location);
  assert.equal(await page.locator('.hud-portrait>img').evaluate(i=>i.getAttribute('src').includes('portrait')||i.getAttribute('src').endsWith('.jpg')),true);
  assert.ok(await page.locator('.hud-portrait>img').evaluate(i=>i.complete&&i.naturalWidth>0));
 }
 assert.equal(await page.locator('#selection-panel').count(),0);check('All hero portraits use head assets at the same HUD position; no separate inspection panel');
 await page.locator(`[data-inspect-hero="${await page.evaluate(()=>window.enemyId)}"]`).click();
 await page.waitForFunction(()=>document.querySelector('#hp-label').textContent==='321 / 900');
 assert.equal(await page.locator('#mana-label').textContent(),'111 / 500');
 assert.equal(await page.locator('#ability-1').getAttribute('aria-label').then(s=>/2 级/.test(s)),true);
 assert.equal(await page.locator('#cooldown-0').textContent(),'9');assert.equal(await page.locator('.equipped-slots .item-charges').textContent(),'7');
 await page.waitForSelector('.hud-vitals [data-status-id="ogreBloodlust"]');
 const before=await page.evaluate(()=>JSON.stringify({abilities:window.g.player.abilityLevels,inventory:window.g.player.inventory,autocast:window.g.player.autocast,enemy:window.g.selected.inventory}));
 await page.locator('#ability-0').click();await page.locator('#ability-0').click({button:'right'});
 await page.locator('.equipped-slots [data-slot-index="0"]').dblclick();
 assert.equal(await page.locator('.equipped-slots [data-slot-index="0"]').getAttribute('draggable'),'false');
 await page.keyboard.press('u');assert.ok(await page.locator('.talent-panel').isVisible());
 assert.ok(await page.locator('[data-talent]').evaluateAll(bs=>bs.every(b=>b.disabled)));assert.ok(await page.locator('#learn-talent').isHidden());
 await page.keyboard.press('Escape');assert.ok(await page.locator('.talent-panel').isHidden());assert.equal(await page.locator('.modal-backdrop').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify({abilities:window.g.player.abilityLevels,inventory:window.g.player.inventory,autocast:window.g.player.autocast,enemy:window.g.selected.inventory})),before);
 assert.equal(await page.locator('#shop').isVisible(),false);
 await page.evaluate(()=>{window.g.selected.hp=222;window.g.selected.inventoryMeta[0].charges=5;delete window.g.selected.statuses.ogreBloodlust;});
 await page.waitForFunction(()=>document.querySelector('#hp-label').textContent==='222 / 900');
 await page.waitForFunction(()=>document.querySelector('.equipped-slots .item-charges').textContent==='5');
 await page.waitForFunction(()=>!document.querySelector('.hud-vitals [data-status-id="ogreBloodlust"]'));
 await page.locator('#toast').evaluate(e=>e.classList.remove('visible'));await page.screenshot({path:'artifacts/selected-enemy-1920.png'});
 check('Enemy vitals, skill ranks/cooldowns, items/charges and buffs update live; foreign controls cannot mutate either hero');
 await page.locator(`[data-inspect-hero="${await page.evaluate(()=>window.allyId)}"]`).click();assert.equal(await page.locator('.game-hud').getAttribute('data-ownership'),'ally');
 // A second human must remain read-only, even though its legacy isPlayer flag is true.
 await page.evaluate(()=>window.g.selected.isPlayer=true);await page.waitForTimeout(130);assert.equal(await page.locator('#ability-0').getAttribute('aria-readonly'),'true');
 const empty=await page.evaluate(()=>window.r.worldToScreen(10000,10000));await page.mouse.click(empty.x,empty.y);
 assert.equal(await page.locator('.game-hud').getAttribute('data-ownership'),'own');
 await page.locator(`[data-inspect-hero="${await page.evaluate(()=>window.enemyId)}"]`).click();await page.keyboard.press('q');assert.equal(await page.locator('.game-hud').getAttribute('data-ownership'),'own');
 check('Ally/co-op ownership uses unit ID; empty-map left-click and own skill hotkeys restore the player HUD');
 await page.evaluate(()=>window.g.paused=false);await page.waitForSelector('#learn-talent:not([hidden])');
 const plus=await page.locator('#learn-talent').boundingBox(),tree=await page.locator('#talent-button').boundingBox();assert.equal(plus.width,plus.height);assert.ok(tree.width>=60);assert.ok(plus.y+plus.height<=tree.y+1);
 await page.locator('#learn-talent').click();await page.locator('[data-talent="0"]').click();await page.waitForFunction(()=>document.querySelector('#learn-talent').hidden);assert.ok(await page.locator('[data-talent="0"]').evaluate(b=>b.classList.contains('learned')));
 // Synthetic frozen fixtures cannot be serialized (their spawn timers are Infinity).
 await page.locator('#toast').evaluate(e=>e.classList.remove('visible'));await page.screenshot({path:'artifacts/selected-talents-1920.png'});await page.locator('.talent-close').click();await page.evaluate(()=>window.g.paused=true);
 check('Large Valve talent tree, square plus above it, eligible learning and immediate plus removal');
 await page.locator('#shop-button').click();assert.equal(await page.locator('.shop-column').count(),2);assert.equal(await page.locator('.shop-group').count(),11);
 assert.deepEqual(await page.locator('[data-shop-group="consumables"] [data-item]').evaluateAll(bs=>bs.map(b=>b.dataset.item)),SHOP_GROUPS.find(g=>g.id==='consumables').items);
 assert.equal(await page.locator('.shop-catalog [data-item]').count(),SHOP_GROUPS.filter(g=>g.column!=='recipes'&&g.id!=='variants').reduce((n,g)=>n+g.items.length,0));
 await page.locator('[data-category="recipes"]').click();assert.equal(await page.locator('.shop-catalog [data-item]').count(),ITEMS.filter(i=>i.recipeOnly).length);
 await page.locator('[data-category="all"]').click();await page.locator('#item-search').fill('recipe_');assert.equal(await page.locator('.shop-catalog [data-item]').count(),ITEMS.filter(i=>i.recipeOnly).length);await page.locator('#item-search').fill('');
 for(const id of SHOP_GROUPS.find(g=>g.id==='variants').items){await page.locator('#item-search').fill(id);assert.ok(await page.locator(`.shop-catalog [data-item="${id}"]`).count());}await page.locator('#item-search').fill('');
 check('Valve shop groups/order, two-column basic/upgrades view and all 268 items reachable through catalog/recipes/search');
 for(const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.mouse.move(0,0);await page.locator('#shop').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(viewport.width<700){assert.ok(await page.locator('.item-detail>.item-description').isVisible());assert.ok((await page.locator('.item-detail>.item-description').textContent()).length>0);}
  for(const selector of ['#shop','.shop-search','.shop-categories','.shop-content .item-detail']){const b=await page.locator(selector).boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,selector+' fits '+viewport.width);}
  await page.screenshot({path:`artifacts/selected-shop-${viewport.width}.png`});await page.locator('#close-shop').click();
  for(const selector of ['.hud-portrait','#talent-button','#ability-0','#ability-3','.equipped-slots','.backpack-slots']){const b=await page.locator(selector).boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,selector+' fits '+viewport.width);}
  const buttons=await page.locator('.talent-button,#ability-0,#ability-1,#ability-2,#ability-3,.innate-button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,right:r.right};}));for(let i=1;i<buttons.length;i++)assert.ok(buttons[i].x>=buttons[i-1].right-1,'skill controls do not overlap');
  await page.screenshot({path:`artifacts/selected-hud-${viewport.width}.png`});await page.locator('#shop-button').click();
 }
 check('Desktop/laptop/mobile: visible shared HUD and shop, no horizontal overflow or overlapping skill controls');
 assert.deepEqual(errors,[]);await writeFile('artifacts/selected-hud-report.json',JSON.stringify({checks,errors},null,2)+'\n');
}finally{await browser.close();}
