import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5193',{waitUntil:'networkidle'});
 await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
  Renderer.prototype.render=function(game,time){window.denyGame=game;window.denyRenderer=this;return render.call(this,game,time);};
 });
 await page.locator('[data-hero="juggernaut"]').click();
 await page.locator('#start-game').click();
 await page.waitForFunction(()=>window.denyGame?.time>.1);
 await page.evaluate(()=>{
  const g=denyGame,p=g.player;g.step=()=>{};g._spawnWave();
  const creeps=g.entities.filter(e=>e.kind==='creep'&&e.team===p.team&&!e.ranged),low=creeps[0],high=creeps[1];
  const enemy=g._makeHero('crystal_maiden',1-p.team,1,false,0);
  Object.assign(p,{x:10400,y:10400,attackCooldown:0,abilityLevels:[0,0,0,0],destination:null,explicitTarget:null,movementInput:{x:0,y:0}});
  Object.assign(low,{x:10545,y:10400,maxHp:300,hp:1,armor:0});
  Object.assign(high,{x:10700,y:10400,maxHp:300,hp:300});
  Object.assign(enemy,{x:10800,y:10400});
  g.entities=[p,low,high,enemy];g._index();g.selectEntity(p.id);
  window.denyLowId=low.id;window.denyHighId=high.id;
  window.denyBefore={gold:p.gold,lastHits:p.lastHits,denies:p.denies||0,xp:enemy.xp,bounty:low.xpBounty};
  denyRenderer.zoom=.9;denyRenderer.lookAt(10600,10400);
 });
 const position=id=>page.evaluate(id=>{
  const entity=denyGame.entities.find(e=>e.id===id),point=denyRenderer.worldToScreen(entity.x,entity.y),bounds=denyRenderer.canvas.getBoundingClientRect();
  return {x:point.x+bounds.left,y:point.y+bounds.top};
 },id);
 const high=await position(await page.evaluate(()=>denyHighId));
 await page.mouse.click(high.x,high.y);
 assert.equal(await page.evaluate(()=>denyGame.selectedId===denyHighId),true);
 await page.mouse.click(high.x,high.y,{button:'right'});
 assert.equal(await page.evaluate(()=>denyGame.player.explicitTarget),null);
 assert.ok(await page.evaluate(()=>denyGame.player.destination));
 const low=await position(await page.evaluate(()=>denyLowId));
 await page.mouse.click(low.x,low.y,{button:'right'});
 assert.equal(await page.evaluate(()=>denyGame.player.explicitTarget),await page.evaluate(()=>denyLowId));
 const result=await page.evaluate(()=>{
  const g=denyGame;g._playerTick(g.player,.05);
  return {dead:g.entities.find(e=>e.id===denyLowId).dead,gold:g.player.gold,lastHits:g.player.lastHits,denies:g.player.denies,
   xp:g.entities.find(e=>e.kind==='hero'&&e.team!==g.player.team).xp,before:denyBefore};
 });
 assert.equal(result.dead,true);assert.equal(result.gold,result.before.gold);assert.equal(result.lastHits,result.before.lastHits);
 assert.equal(result.denies,result.before.denies+1);assert.equal(result.xp,result.before.xp+result.before.bounty*.5);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'artifacts/deny-browser.png'});
 await writeFile('artifacts/deny-browser-report.json',JSON.stringify({checks:['Friendly selection and healthy-creep right-click movement','Low-health friendly-creep right-click deny with no gold and half enemy XP'],result,errors},null,2)+'\n');
 console.log('PASS friendly selection/movement and right-click deny: no gold, deny credit, half enemy XP');
}finally{await browser.close();}
