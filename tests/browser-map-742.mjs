import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'domcontentloaded'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.mapGame=g;window.mapRenderer=this;return render.call(this,g,t);};});
 await page.locator('[data-hero="weaver"]').click();await page.locator('#difficulty').selectOption('normal');
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.mapGame?.time>.1);
 await page.evaluate(()=>{
  const g=mapGame,p=g.player;g.entities=[p];g.effects=[];g.pendingSpells=[];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=g.nextBuildingCheck=Infinity;
  Object.assign(p,{x:9856,y:9792,destination:null,navPath:null,explicitTarget:null,movementInput:{x:0,y:0},attackCooldown:999,abilityLevels:[0,0,0,0],statuses:{}});
  g._index();mapRenderer.zoom=.8;mapRenderer.followPlayer=false;mapRenderer.lookAt(9856,9952);
 });
 const clickGround=async point=>{const screen=await page.evaluate(point=>{const p=mapRenderer.worldToScreen(point.x,point.y),rect=mapRenderer.canvas.getBoundingClientRect();return{x:p.x+rect.left,y:p.y+rect.top};},point);await page.mouse.click(screen.x,screen.y,{button:'right'});};
 await clickGround({x:9856,y:10112});
 await page.waitForFunction(()=>Math.hypot(mapGame.player.x-9856,mapGame.player.y-10112)<10,null,{timeout:6000});
 const opened=await page.evaluate(()=>({x:mapGame.player.x,y:mapGame.player.y,time:mapGame.time}));
 assert.ok(Math.hypot(opened.x-9856,opened.y-10112)<10);
 await page.evaluate(()=>{const g=mapGame,p=g.player;Object.assign(p,{x:9792,y:9792,destination:null,navPath:null,explicitTarget:null,movementInput:{x:0,y:0}});g._index();mapRenderer.lookAt(9952,9856);});
 await clickGround({x:9984,y:9792});
 const redirected=await page.evaluate(()=>({requested:{x:9984,y:9792},destination:mapGame.player.destination}));
 assert.ok(Math.hypot(redirected.destination.x-9984,redirected.destination.y-9792)>=64,'the real ground command must avoid the new cliff');
 await page.waitForFunction(()=>!mapGame.player.destination,null,{timeout:6000});
 const stopped=await page.evaluate(()=>({x:mapGame.player.x,y:mapGame.player.y,walkable:mapGame.navigation.isWalkable(mapGame.player),url:mapRenderer.mapAsset.image?.src}));
 assert.ok(stopped.walkable&&Math.hypot(stopped.x-9984,stopped.y-9792)>32);
 assert.deepEqual(errors,[]);await page.screenshot({path:'artifacts/map-742-ground-orders.png'});
 await writeFile('artifacts/map-742-ground-orders.json',JSON.stringify({opened,redirected,stopped,errors},null,2));
 console.log('PASS real ground orders use the new 7.42 opening and avoid the new cliff');
}finally{await browser.close();}
