import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));const check=s=>{checks.push(s);console.log('PASS '+s);};await mkdir('artifacts',{recursive:true});
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5194',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>g?.time>.1);
 await page.evaluate(async()=>{
  const {Navigator}=await import('/src/navigation.js'),{createMeta}=await import('/src/inventory.js');const p=g.player;g.entities=[p];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=1e9;
  Object.assign(p,{x:6000,y:6016,destination:null,navPath:null});const blocker=g._unit('creep',0,6160,6016,{radius:16,speed:0,maxHp:10000}),walls=[5866,6166].map(y=>g._unit('filler',0,6160,y,{bounds:[400,220],radius:200,speed:0,maxHp:10000}));
  g.entities.push(blocker,...walls);g._creepTick=()=>{};g.navigation=new Navigator({cols:240,rows:240,cellSize:32,blocked:'0'.repeat(57600)},[],walls);g._index();p.inventory=['phase_boots'];p.inventoryMeta=[createMeta(p,'phase_boots')];g._refreshHero(p);r.center(p);r.zoom=.8;window.blocker=blocker;window.walls=walls;
 });
 await page.locator('#battlefield').focus();const time=await page.evaluate(()=>g.time);await page.keyboard.down('ArrowRight');await page.waitForFunction(t=>g.time>t+1.2,time);await page.keyboard.up('ArrowRight');
 const blocked=await page.evaluate(()=>({x:g.player.x,y:g.player.y,d:Math.hypot(g.player.x-blocker.x,g.player.y-blocker.y)}));assert.ok(blocked.x>6050&&blocked.x<=6120.01,JSON.stringify(blocked));assert.ok(blocked.d>=40-.01);await page.screenshot({path:'artifacts/collision-blocked.png'});check('Real keyboard movement is body-blocked by an allied creep in a building corridor');
 await page.keyboard.press('1');await page.waitForFunction(()=>Object.values(g.player.statuses).some(s=>s.phased&&s.until>g.time));await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>g.player.x>6200);await page.keyboard.up('ArrowRight');check('Using phase boots through the HUD binding passes the blocking creep');
 const started=await page.evaluate(()=>g.time);await page.keyboard.down('ArrowUp');await page.waitForFunction(t=>g.time>t+.7,started);await page.keyboard.up('ArrowUp');assert.ok(await page.evaluate(()=>g.player.y>=6000-.01));check('Buildings still block movement during phase');
 await page.waitForFunction(()=>!Object.values(g.player.statuses).some(s=>s.phased&&s.until>g.time));
 await page.evaluate(()=>{const p=g.player;Object.assign(p,{x:6000,y:6016,destination:null,navPath:null});g._index();});const resumed=await page.evaluate(()=>g.time);await page.keyboard.down('ArrowRight');await page.waitForFunction(t=>g.time>t+1,resumed);await page.keyboard.up('ArrowRight');assert.ok(await page.evaluate(()=>g.player.x<=6120.01));check('Collision returns after the phase status expires');
 assert.deepEqual(errors,[]);await writeFile('artifacts/collision-report.json',JSON.stringify({checks,errors},null,2)+'\n');
}finally{await browser.close();}
