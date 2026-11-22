import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.locator('#difficulty').selectOption('hell');
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.stealthGame=g;window.stealthRenderer=this;return render.call(this,g,t);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.stealthGame?.time>.1);
 await page.evaluate(async()=>{
  const Inventory=await import('/src/inventory.js'),g=stealthGame,p=g.player,b=g._makeHero('crystal_maiden',1,1,false,0);
  g.entities=[p,b];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=g.nextBuildingCheck=Infinity;for(const c of g.camps)c.nextSpawn=Infinity;
  Object.assign(p,{x:10400,y:10400,inventory:['glimmer_cape'],inventoryMeta:[],gold:0,abilityLevels:[0,0,0,0],statuses:{},hpRegen:0,attackCooldown:999});
  Object.assign(b,{x:10700,y:10400,inventory:['dust'],inventoryMeta:[],gold:0,abilityLevels:[0,0,0,0],skillPoints:0,talentPoints:0,attackCooldown:999,aiTimer:0,draftRole:'support',botShop:{nextAt:Infinity,needsShop:false}});
  Inventory.ensureInventory(p);Inventory.ensureInventory(b);g._refreshHero(p);g._refreshHero(b);p.mana=p.maxMana;p.hp=p.maxHp;
  window.detectorId=b.id;g._index();g.step(.15);g.paused=false;stealthRenderer.followPlayer=false;stealthRenderer.zoom=.5;stealthRenderer.lookAt(10550,10400);
 });
 await page.locator('#battlefield').focus();await page.keyboard.press('Alt+1');
 await page.waitForFunction(()=>stealthGame.itemZones?.some(z=>z.itemId==='dust'&&z.sourceId===detectorId),{},{timeout:6000});
 await page.waitForFunction(()=>stealthGame.entities.find(e=>e.id===detectorId)?.targetId===stealthGame.player.id,{},{timeout:4000});
 const report=await page.evaluate(()=>{const g=stealthGame,p=g.player,b=g.entities.find(e=>e.id===detectorId);g.paused=true;return {difficulty:g.difficulty,glimmerUsed:p.inventoryMeta[0].cooldownRemaining>0,dustConsumed:!b.inventory.includes('dust'),visible:g.canSee(b,p),target:b.targetId,expected:p.id,zone:g.itemZones.find(z=>z.itemId==='dust'&&z.sourceId===b.id)};});
 assert.equal(report.difficulty,'hell');assert.ok(report.glimmerUsed&&report.dustConsumed&&report.visible);assert.equal(report.target,report.expected);
 await page.screenshot({path:'artifacts/ai-stealth-dust.png'});assert.deepEqual(errors,[]);
 await writeFile('artifacts/ai-stealth-browser.json',JSON.stringify({report,errors},null,2));console.log('PASS Real player Glimmer hotkey triggers AI Dust consumption, reveal and target reacquisition');
}finally{await browser.close();}
