import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
const check=s=>{checks.push(s);console.log('PASS '+s);};page.on('pageerror',e=>errors.push(e.message));await mkdir('artifacts',{recursive:true});
const edit=async(group,index,key)=>{await page.locator(`[data-binding-group="${group}"][data-binding-index="${index}"]`).click();await page.keyboard.press(key);};
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5194',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};});
 await page.locator('[data-hero="ogre_magi"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);const logo=await page.locator('.match-brand').boundingBox(),gear=await page.locator('.match-settings-button').boundingBox();assert.ok(gear.width>=36&&gear.height>=36);assert.ok(gear.x>=logo.x+logo.width&&gear.x<110);assert.ok(gear.y<15);
  await page.locator('.match-settings-button').click();assert.ok(await page.locator('.keybinding-settings').isVisible());assert.equal(await page.evaluate(()=>g.paused),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/keybindings-${viewport.width}.png`});await page.keyboard.press('Escape');
 }
 check('Large top-left gear and usable settings dialog on laptop and mobile');await page.setViewportSize({width:1366,height:768});
 await page.evaluate(async()=>{const {createMeta}=await import('/src/inventory.js');const p=g.player;g.entities=[p];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=1e9;g._heroTick=()=>{};p.inventory=['armlet','soul_ring','dagon','magic_wand','phase_boots','black_king_bar'];p.inventoryMeta=p.inventory.map(id=>createMeta(p,id));g._refreshHero(p);window.inputCalls=[];for(const name of ['cast','useItem','learnAbility','castExtra']){const fn=g[name];g[name]=function(...args){inputCalls.push({name,index:args[0],self:args[1]?.id===p.id});return fn.apply(this,args);};}});
 await page.locator('.match-settings-button').click();const time=await page.evaluate(()=>g.time);
 await edit('skills',0,'a');await edit('skills',1,'a');assert.ok(await page.locator('.keybinding-status').textContent().then(s=>s.includes('重复')));assert.equal(await page.locator('#save-settings').isDisabled(),true);
 await edit('skills',1,'s');await edit('skills',2,'d');await edit('skills',3,'f');
 for(const [i,key]of [...'qwerty'].entries())await edit('items',i,key);
 await edit('skills',0,'Escape');assert.ok(await page.locator('.keybindings-modal').isVisible());
 await edit('skills',0,'b');assert.ok(await page.locator('.keybinding-status').textContent().then(s=>s.includes('保留')));await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>g.time),time);assert.deepEqual(await page.evaluate(()=>inputCalls),[]);await page.locator('#save-settings').click();
 assert.deepEqual(await page.locator('.ability kbd').allTextContents(),[...'ASDF']);assert.deepEqual(await page.locator('.equipped-slots kbd').allTextContents(),[...'QWERTY']);
 await page.locator('#battlefield').focus();await page.keyboard.press('Control+a');await page.waitForFunction(()=>g.player.abilityLevels[0]===1);
 await page.keyboard.press('Control+d');await page.waitForFunction(()=>g.player.abilityLevels[2]===0); // level one has spent its skill point
 await page.evaluate(()=>{g.player.level=3;g.player.skillPoints=2;g.player.mana=g.player.maxMana;});await page.keyboard.press('Control+d');await page.waitForFunction(()=>g.player.abilityLevels[2]===1);
 await page.keyboard.press('Alt+d');await page.waitForFunction(()=>g.player.statuses.ogreBloodlust);assert.equal(await page.evaluate(()=>inputCalls.filter(c=>c.name==='cast').at(-1).index),2);
 await page.keyboard.press('q');await page.waitForFunction(()=>g.player.inventoryMeta[0].mode==='on');await page.keyboard.press('t');await page.waitForFunction(()=>Object.values(g.player.statuses).some(s=>s.phased));
 await page.keyboard.press('f');assert.equal(await page.locator('#shop').isVisible(),false);await page.keyboard.press('Tab');assert.equal(await page.locator('#shop').isVisible(),true);await page.keyboard.press('Tab');
 const count=await page.evaluate(()=>inputCalls.length);await page.keyboard.press('1');assert.equal(await page.evaluate(()=>inputCalls.length),count);
 assert.deepEqual(await page.evaluate(()=>g.player.movementInput),{x:0,y:0});check('ASDF skills, QWERTY items, Ctrl learning, Alt self-cast and legacy shortcut conflict handling work in gameplay');
 await page.locator('.match-settings-button').click();await edit('skills',0,'j');await page.keyboard.press('Escape');assert.equal(await page.locator('#ability-0 kbd').textContent(),'A');check('Capture pauses input, rejects duplicates/reserved keys, and discards unsaved edits');
 await page.evaluate(()=>{g.player.hasScepter=true;});await page.waitForSelector('.extra-ability');assert.equal(await page.locator('.extra-ability kbd').first().textContent(),'Z');
 await page.keyboard.press('z');assert.equal(await page.evaluate(()=>inputCalls.at(-1).name),'castExtra');
 await page.reload({waitUntil:'networkidle'});await closeDevelopmentNotice(page);await page.locator('#resume-game').click();await page.waitForSelector('.modal');await page.locator('[data-close]').last().click();assert.deepEqual(await page.locator('.ability kbd').allTextContents(),[...'ASDF']);assert.deepEqual(await page.locator('.equipped-slots kbd').allTextContents(),[...'QWERTY']);
 await page.locator('.match-settings-button').click();await page.locator('#reset-keybindings').click();await page.locator('#save-settings').click();assert.deepEqual(await page.locator('.ability kbd').allTextContents(),[...'QWER']);assert.deepEqual(await page.locator('.equipped-slots kbd').allTextContents(),[...'123456']);check('Extra ability fallback, reload persistence and restoring defaults');
 assert.deepEqual(errors,[]);await writeFile('artifacts/keybindings-report.json',JSON.stringify({checks,errors},null,2)+'\n');
}finally{await browser.close();}
