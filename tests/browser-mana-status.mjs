import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
const check=s=>{checks.push(s);console.log('PASS '+s);};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await mkdir('artifacts',{recursive:true});
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5193',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};});
 await page.locator('[data-hero="kunkka"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
 const base=await page.evaluate(async()=>{const p=g.player,{createMeta}=await import('/src/inventory.js');g.entities=[p];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;Object.assign(p,{x:10400,y:10400,abilityLevels:[0,4,0,0],inventory:['soul_ring','glimmer_cape'],inventoryMeta:[],destination:null,explicitTarget:null});p.inventoryMeta=p.inventory.map(id=>createMeta(p,id));g._refreshHero(p);p.hp=p.maxHp;p.mana=p.maxMana;p.hpRegen=p.manaRegen=0;g._index();r.center(p);return p.maxMana;});
 await page.waitForSelector('.hud-vitals [data-status-id="tide"]');await page.locator('.equipped-slots [data-slot-index="0"]').dblclick();await page.waitForFunction(()=>g.player.statuses['itemBuff:soul_ring']);await page.evaluate(()=>g.setPaused(true));
 const full=await page.evaluate(()=>({mana:g.player.mana,max:g.player.maxMana}));assert.equal(full.mana,base+170);assert.equal(full.max,base+170);await page.waitForSelector('.hud-vitals [data-status-id="itemBuff:soul_ring"]');
 await page.evaluate(()=>g.setPaused(false));await page.locator('.equipped-slots [data-slot-index="1"]').dblclick();const self=await page.evaluate(()=>r.worldToScreen(g.player.x,g.player.y));await page.mouse.click(self.x,self.y);await page.waitForFunction(()=>g.player.statuses['itemBuff:glimmer_cape']);await page.evaluate(()=>g.setPaused(true));
 assert.equal(await page.evaluate(()=>g.player.statuses['itemBuff:soul_ring'].temporaryMana),45);await page.evaluate(()=>{g.setPaused(false);for(let i=0;i<220;i++)g.step(.05);g.setPaused(true);});
 assert.equal(await page.evaluate(()=>g.player.mana),base);assert.equal(await page.evaluate(()=>g.player.maxMana),base);await page.waitForFunction(()=>!document.querySelector('.hud-vitals [data-status-id="itemBuff:soul_ring"]'));check('Item clicks show overflow mana and temporary status; spending and expiry preserve ordinary mana');
 await page.evaluate(async()=>{const p=g.player,{createIllusions}=await import('/src/illusions.js');Object.assign(p,{heroId:'drow_ranger',name:'卓尔游侠',abilityLevels:[4,4,4,3],inventory:['sphere'],inventoryMeta:[],cooldowns:[0,0,0,0]});g._refreshHero(p);const cm=g._makeHero('crystal_maiden',p.team,1,false,5);Object.assign(cm,{x:p.x+1000,y:p.y,abilityLevels:[0,0,4,0],controller:'human',attackCooldown:999});g.entities.push(cm);window.clone=createIllusions(g,p,1,30)[0];g.setPaused(false);g.step(.05);g.setPaused(true);g.selectEntity(clone.id);});
 await page.waitForFunction(()=>document.querySelector('.game-hud').dataset.unitId===clone.id);
 for(const id of ['marksmanship','trueshot','arcaneAura','spellBlock'])await page.waitForSelector(`.hud-vitals [data-status-id="${id}"]`);
 await page.locator('.hud-vitals [data-status-id="marksmanship"]').hover();await page.waitForSelector('.hud-vitals .status-tooltip:not([hidden])');assert.match(await page.locator('.hud-vitals .status-tooltip').textContent(),/射手天赋/);
 await page.screenshot({path:'artifacts/illusion-passive-status-1366.png'});await page.evaluate(()=>{clone.statuses.break={id:'break',startedAt:g.time,until:g.time+10,break:true};});await page.waitForFunction(()=>!document.querySelector('.hud-vitals [data-status-id="marksmanship"]'));check('Selected illusion uses the shared HUD with actual inherited passive icons, tooltips and break removal');
 assert.deepEqual(errors,[]);await writeFile('artifacts/mana-status-browser-report.json',JSON.stringify({checks,base,full,errors},null,2));
}finally{await browser.close();}
