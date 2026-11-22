import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.pickGame=g;window.pickRenderer=this;return render.call(this,g,t);};});
 await page.locator('[data-hero="weaver"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.pickGame?.time>.1);
 const heroes=await page.evaluate(async()=>Object.keys((await import('/src/data.js')).HEROES));
 for(const hero of heroes){
  const target=await page.evaluate(hero=>{
   const g=pickGame,p=g.player,e=g._makeHero(hero,1,1,false,0);
   Object.assign(p,{x:10400,y:10400,speed:0,attackCooldown:999,destination:null,explicitTarget:null,statuses:{}});
   Object.assign(e,{x:10800,y:10400,speed:0,aiTimer:Infinity,attackCooldown:999,hp:50000,maxHp:50000,angle:-.7});
   g.entities=[p,e];g.selectedId=p.id;g.effects=[];g.pendingSpells=[];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=g.nextBuildingCheck=Infinity;g._index();
   pickRenderer.zoom=.8;pickRenderer.lookAt(10600,10400);
   const point=pickRenderer.worldToScreen(e.x,e.y-60),bounds=pickRenderer.canvas.getBoundingClientRect();
   window.pickTarget=e.id;return {id:e.id,x:point.x+bounds.left,y:point.y+bounds.top};
  },hero);
  await page.mouse.move(target.x,target.y);assert.equal(await page.evaluate(()=>pickRenderer.hoverId),target.id,hero+' body hover identifies the hero');
  await page.mouse.click(target.x,target.y);assert.equal(await page.evaluate(()=>pickGame.selectedId),target.id,hero+' body click inspects the hero');
  await page.mouse.click(target.x,target.y,{button:'right'});assert.equal(await page.evaluate(()=>pickGame.player.explicitTarget),target.id,hero+' body right-click attacks instead of moving to the ground');
  checks.push(hero);
 }
 await page.evaluate(()=>{pickGame.player.explicitTarget=null;const enemy=pickGame.entities.find(e=>e.id===pickTarget);enemy.statuses.hidden={invisible:true,startedAt:pickGame.time,until:pickGame.time+20};pickGame._index();});
 await page.mouse.click(await page.evaluate(()=>pickRenderer.worldToScreen(10800,10340).x+pickRenderer.canvas.getBoundingClientRect().left),await page.evaluate(()=>pickRenderer.worldToScreen(10800,10340).y+pickRenderer.canvas.getBoundingClientRect().top));
 assert.equal(await page.evaluate(()=>pickGame.selectedId),await page.evaluate(()=>pickGame.player.id),'hidden enemy bodies cannot be inspected');
 const ground=await page.evaluate(()=>{const p=pickRenderer.worldToScreen(10600,10600),b=pickRenderer.canvas.getBoundingClientRect();return {x:p.x+b.left,y:p.y+b.top};});
 await page.mouse.click(ground.x,ground.y,{button:'right'});assert.deepEqual(await page.evaluate(()=>pickGame.player.destination),{x:10600,y:10600},'empty ground remains a move command');
 await page.screenshot({path:'artifacts/hero-body-picking.png'});assert.deepEqual(errors,[]);await writeFile('artifacts/hero-picking-report.json',JSON.stringify({checks,errors},null,2));console.log('PASS '+checks.length+' hero body hover, inspection and attack commands; hidden enemies and empty ground');
}finally{await browser.close();}
