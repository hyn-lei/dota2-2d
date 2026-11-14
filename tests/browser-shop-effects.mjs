import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],checks=[],viewports=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const check=message=>{checks.push(message);console.log('PASS '+message);};
const select=async id=>{await page.locator('#item-search').fill(id);await page.locator(`.shop-catalog [data-item="${id}"]`).click();await page.mouse.move(0,0);};
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(game,time){window.effectsGame=game;return render.call(this,game,time);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.effectsGame?.time>.1);
 await page.evaluate(()=>{const game=window.effectsGame;game.entities=[game.player];game.nextWave=game.nextNeutralSpawn=game.roshanRespawnAt=Infinity;game.player.gold=100000;});
 await page.locator('#shop-button').click();await select('bfury');
 const description=page.locator('.item-detail>.item-description'),cleave=description.locator('.item-effect').filter({hasText:'分裂'});
 assert.equal(await description.isVisible(),true);
 assert.deepEqual(await description.locator('.item-effect h4').allTextContents(),['主动砍伐','被动压制','被动分裂']);
 assert.match(await cleave.textContent(),/60%/);assert.match(await cleave.textContent(),/40%/);assert.match(await cleave.textContent(),/650/);assert.match(await cleave.textContent(),/仅近战有效/);
 assert.match(await description.locator('.item-bonuses').textContent(),/攻击力 \+50/);
 await page.locator('.shop-catalog [data-item="bfury"]').hover();
 const tooltip=page.locator('.shop-item-tooltip');assert.equal(await tooltip.isVisible(),true);
 assert.equal(await tooltip.locator('.item-description').textContent(),await description.textContent());
 await page.mouse.move(0,0);
 await description.locator('summary').click();assert.match(await description.locator('details[open]').textContent(),/无视减益免疫/);
 await page.waitForTimeout(250);assert.equal(await description.locator('details[open]').count(),1);
 check('Selecting Battle Fury shows attributes, tree cutting, Quell, 60%/40% Cleave, range, melee restriction and expandable notes');

 for(const id of ['blade_mail','desolator','shivas_guard','monkey_king_bar','satanic','boots','recipe_bfury','travel_boots','radiance','armlet']){
  await select(id);assert.equal(await description.isVisible(),true);assert.ok((await description.textContent()).trim().length>0);
  if(id==='travel_boots')assert.deepEqual(await description.locator('h4').allTextContents(),['升级回城卷轴']);
  if(id==='radiance')assert.deepEqual(await description.locator('h4').allTextContents(),['开关辉耀灼烧']);
  if(id==='armlet')assert.deepEqual(await description.locator('h4').allTextContents(),['开关邪恶之力']);
 }
 check('Active items, multiple passives, auras, basic attributes and recipes all retain selected-item descriptions');

 const catalog=await page.evaluate(async()=>{
  const {ITEMS}=await import('/src/item-data.js'),input=document.querySelector('#item-search'),missing=[];
  const normalize=text=>text.replace(/[\s：:·]/g,'');
  for(const item of ITEMS){
   input.value=item.id;input.dispatchEvent(new Event('input',{bubbles:true}));
   document.querySelector(`.shop-catalog [data-item="${item.id}"]`).click();
   const detail=document.querySelector('.item-detail>.item-description');
   const content=detail.cloneNode(true);
   // Generic section labels are presentation text, absent from the source description.
   for(const heading of content.querySelectorAll('.item-effect h4'))if(!heading.querySelector('span'))heading.remove();
   if(getComputedStyle(detail).display==='none'||!normalize(content.textContent).includes(normalize(item.description)))missing.push(item.id);
  }
  return {count:ITEMS.length,missing};
 });
 assert.deepEqual(catalog.missing,[]);assert.equal(catalog.count,268);
 check('Every purchasable item retains its complete source description in the selected details');

 for(const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:1024,height:576},{width:390,height:844}]){
  await page.setViewportSize(viewport);await select('bfury');
  const heading=page.locator('.item-detail>.detail-heading');assert.equal(await heading.isVisible(),true);
  assert.equal(await heading.evaluate(element=>{const r=element.getBoundingClientRect(),shop=document.querySelector('#shop').getBoundingClientRect(),header=document.querySelector('#shop>.panel-heading').getBoundingClientRect();return r.top>=header.bottom-1&&r.bottom<=shop.bottom+1;}),true);
  await page.screenshot({path:`artifacts/shop-effects-selected-${viewport.width}.png`});
  await description.evaluate(element=>element.scrollTop=0);
  await cleave.scrollIntoViewIfNeeded();
  const bounds=await cleave.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y>=0&&bounds.y+bounds.height<=viewport.height+1);
  const visible=await cleave.evaluate(element=>{const r=element.getBoundingClientRect(),shop=document.querySelector('#shop').getBoundingClientRect(),details=element.closest('.item-description').getBoundingClientRect();return r.top>=Math.max(shop.top,details.top)-1&&r.bottom<=Math.min(shop.bottom,details.bottom)+1;});
  assert.equal(visible,true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  viewports.push({viewport,bounds});await page.screenshot({path:`artifacts/shop-effects-${viewport.width}.png`});
 }
 check('Cleave can be read inside the shop and effect pane at desktop, laptop, short laptop and mobile sizes');
 assert.deepEqual(errors,[]);
 const build=await page.evaluate(()=>document.querySelector('meta[name="game-build"]')?.content||null);
 await writeFile('artifacts/shop-effects-browser-report.json',JSON.stringify({url:page.url(),build,checks,catalog,viewports,errors},null,2));
}finally{await browser.close();}
