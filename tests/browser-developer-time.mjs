import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {createCoopServer} from '../server/coop-server.mjs';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

let service,base=process.env.GAME_URL;
if(!base){service=createCoopServer({root:resolve(process.env.STATIC_ROOT||process.cwd()),port:0,autoTick:false});await service.listen();base=`http://127.0.0.1:${service.server.address().port}`;}
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[],dialogs=[];
page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>{dialogs.push(dialog.type());await dialog.accept();});
const check=name=>{checks.push(name);console.log('PASS '+name);};
async function observe(){
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(game,time){if(game)window.g=game;window.frames=(window.frames||0)+1;return render.call(this,game,time);};});
}
async function settings(){await page.locator('.settings-button').click();await page.locator('#developer-mode-settings').scrollIntoViewIfNeeded();}
async function unlock(){await page.locator('#developer-mode-toggle').click();await page.locator('#developer-password').fill('821027');await page.locator('#developer-password').press('Enter');}
async function apply(minutes,enter=false){await page.locator('#developer-time').fill(String(minutes));if(enter)await page.locator('#developer-time').press('Enter');else await page.locator('#developer-time-apply').click();}
async function reloaded(trigger){
 const navigation=page.waitForEvent('framenavigated',frame=>frame===page.mainFrame());
 await trigger();await navigation;await page.waitForLoadState('networkidle');await closeDevelopmentNotice(page);await page.waitForSelector('#start-game');
}
const retainedKeys=['af-preferences','af-history','af-keybindings-v1','af-ai-drafts-v1'];
try{
 await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);await observe();
 await page.locator('[data-hero="chen"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
 await settings();assert.equal(await page.locator('#developer-time').count(),0);await unlock();
 assert.equal(await page.locator('#developer-time').count(),1,'the unlocked developer settings must expose match time');
 await apply(1);assert.equal(await page.evaluate(()=>g.time),60);
 const before=await page.evaluate(async()=>{
  const {addStatus}=await import('/src/hero-runtime.js');addStatus(g,g.player,'timeControlArmor',{duration:10,armor:8,positive:true});g.player.cooldowns[0]=7;
  return {units:g.entities.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp})),seed:g.seed,serial:g.serial,gold:g.player.gold,frames,origin:performance.timeOrigin};
 });
 await apply(200);
 assert.deepEqual(await page.evaluate(()=>({units:g.entities.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp})),seed:g.seed,serial:g.serial,gold:g.player.gold})),{units:before.units,seed:before.seed,serial:before.serial,gold:before.gold});
 assert.deepEqual(await page.evaluate(()=>[g.time,g.wave,g.nextWave,g.nextNeutralSpawn,g.player.cooldowns[0],g.player.statuses.timeControlArmor.until-g.time]),[12000,401,12030,12060,7,10]);
 assert.equal(await page.locator('#match-time').textContent(),'200:00');
 assert.ok(await page.evaluate(count=>frames>count,before.frames));assert.equal(await page.evaluate(()=>performance.timeOrigin),before.origin);
 check('The real settings jump 1 to 200 minutes immediately, update the HUD and preserve units, resources, active effects and cooldowns');

 await apply(.5,true);assert.equal(await page.evaluate(()=>g.time),30);assert.equal(await page.locator('#match-time').textContent(),'00:30');
 await apply(501);assert.match(await page.locator('#developer-mode-status').textContent(),/0.*500/);assert.equal(await page.evaluate(()=>g.time),30);
 await page.locator('#developer-time').fill('');await page.locator('#developer-time-apply').click();assert.match(await page.locator('#developer-mode-status').textContent(),/0.*500/);
 check('Enter can rewind the match; empty and over-limit values leave the current time unchanged');

 for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.locator('#developer-time').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const selector of ['#developer-time','#developer-time-apply']){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=viewport.width+1);}
  await page.screenshot({path:`artifacts/developer-time-${viewport.width}.png`});
 }
 await page.setViewportSize({width:1366,height:768});check('Time input and Apply remain visible and usable on laptop and mobile layouts');

 await apply(500);assert.equal(await page.evaluate(()=>g.time),30000);
 const boundary=await page.evaluate(()=>({save:localStorage.getItem('af-single-match-v1'),retained:Object.fromEntries(['af-preferences','af-history','af-keybindings-v1','af-ai-drafts-v1'].map(key=>[key,localStorage.getItem(key)])),origin:performance.timeOrigin}));
 assert.equal(JSON.parse(boundary.save).state.time,30000);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>performance.timeOrigin),boundary.origin);
 await reloaded(()=>page.keyboard.press('Escape'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('af-single-match-v1')),null);assert.equal(await page.locator('#resume-game').count(),0);
 assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),retainedKeys),boundary.retained);assert.deepEqual(dialogs,[]);
 check('Exactly 500 minutes is allowed while paused; crossing it forces a real reload with no confirmation and no save recreated by unload handlers');

 await observe();await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);await settings();await unlock();await apply(500);
 await reloaded(()=>page.evaluate(()=>{g.time=30000.01;g.status='won';g.paused=true;}));
 assert.equal(await page.evaluate(()=>localStorage.getItem('af-single-match-v1')),null);assert.equal(await page.locator('#resume-game').count(),0);
 check('An already won and paused match still clears its save and reloads when its time exceeds 500 minutes');

 const expired=JSON.parse(boundary.save);expired.state.time=30000.01;
 await page.evaluate(raw=>localStorage.setItem('af-single-match-v1',raw),JSON.stringify(expired));await page.reload({waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 assert.equal(await page.evaluate(()=>localStorage.getItem('af-single-match-v1')),null);assert.equal(await page.locator('#resume-game').count(),0);
 check('An older over-limit checkpoint is removed on page load and cannot reappear as a resumable match');

 await observe();await page.locator('#open-coop').click();await page.waitForFunction(()=>document.querySelector('#coop-connection').textContent.includes('已连接'));
 await page.locator('#coop-name').fill('Time Controls');await page.locator('#coop-join-hero').selectOption('chen');await page.locator('#coop-fill-ai').check();await page.locator('#coop-create').click();await page.waitForSelector('#coop-room-code');
 await page.locator('#coop-ready').click();await page.waitForFunction(()=>!document.querySelector('#coop-start').disabled);await page.locator('#coop-start').click();await page.waitForFunction(()=>window.g?.isNetwork);
 await settings();assert.equal(await page.locator('#developer-mode-toggle').isDisabled(),true);assert.equal(await page.locator('#developer-time').count(),0);
 assert.equal(await page.evaluate(async()=>(await import('/src/developer-mode.js')).setDeveloperTime(g,200).ok),false);
 check('A real one-player plus nine-AI network room rejects developer time controls');
 assert.deepEqual(errors,[]);await writeFile('artifacts/developer-time-browser-report.json',JSON.stringify({checks,errors,dialogs},null,2)+'\n');
}catch(error){await page.screenshot({path:'artifacts/developer-time-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();await service?.close();}
