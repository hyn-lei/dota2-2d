import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5193',{waitUntil:'networkidle'});
 await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
  Renderer.prototype.render=function(game,time){window.vectorGame=game;window.vectorRenderer=this;return render.call(this,game,time);};
 });
 await page.locator('[data-hero="windranger"]').click();
 await page.locator('#start-game').click();
 await page.waitForFunction(()=>window.vectorGame?.time>.1);
 await page.evaluate(()=>{
  const g=vectorGame,p=g.player;p.consumedShard=true;g._refreshHero(p);p.mana=p.maxMana;
  vectorRenderer.zoom=.9;vectorRenderer.lookAt(p.x+180,p.y);g.step=()=>{};
 });
 const extra=page.locator('[data-extra="windrunner_gale_force"]');
 const shortcut=(await extra.locator('kbd').textContent()).trim().toLowerCase();
 const initial=await page.evaluate(()=>vectorGame.player.mana);
 const aim=await page.evaluate(()=>{
  const p=vectorGame.player,r=vectorRenderer,box=r.canvas.getBoundingClientRect();
  return [{x:p.x+180,y:p.y},{x:p.x+180,y:p.y+150}].map(at=>{
   const screen=r.worldToScreen(at.x,at.y);return {x:screen.x+box.left,y:screen.y+box.top};
  });
 });
 await extra.click();await page.mouse.click(aim[0].x,aim[0].y);await page.keyboard.press('Escape');
 assert.deepEqual(await page.evaluate(()=>({mana:vectorGame.player.mana,casting:!!vectorGame.player.castPhase})),{mana:initial,casting:false});
 await page.keyboard.press(shortcut);await page.mouse.click(aim[0].x,aim[0].y);
 await page.mouse.click(aim[1].x,aim[1].y,{button:'right'});
 assert.deepEqual(await page.evaluate(()=>({mana:vectorGame.player.mana,casting:!!vectorGame.player.castPhase})),{mana:initial,casting:false});
 await page.keyboard.press(shortcut);await page.mouse.click(aim[0].x,aim[0].y);
 assert.equal(await page.evaluate(()=>!!vectorGame.player.castPhase),false);
 await page.mouse.click(aim[1].x,aim[1].y);
 const wind=await page.evaluate(()=>{
  const g=vectorGame,p=g.player,phase=p.castPhase;
  g.time=phase.executeAt;g._resolveDelayedSpells();
  const gale=g.pendingSpells.find(spell=>spell.type==='gale');
  return {mana:p.mana,dir:gale?.dir,source:p.id,owner:gale?.sourceId};
 });
 assert.equal(wind.mana,initial-125);
 assert.equal(wind.source,wind.owner);
 assert.ok(Math.abs(wind.dir.x)<.01&&wind.dir.y>.99);
 assert.deepEqual(errors,[]);
 console.log('PASS Gale Force requires two points and cancels without spending mana');
}finally{await browser.close();}
