import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

const base=process.env.GAME_URL||'http://127.0.0.1:5190';
const heroes=['ogre_magi','juggernaut','crystal_maiden','windranger','axe'];
await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({headless:true});
const contexts=[],pages=[],errors=[],checks=[],networkEvents=[];
const check=name=>{checks.push(name);console.log(`PASS ${name}`);};
async function observe(page){await page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;let lastDraw=-Infinity;
  // Five devices share this test machine. Limit only Canvas drawing, keeping input polling and HUD updates unchanged.
  Renderer.prototype.render=function(g,t){if(g)window.observedGame=g;window.observedRenderer=this;const now=performance.now();if(now-lastDraw<200)return;lastDraw=now;return render.call(this,g,t);};
});}
async function open(page){await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);await observe(page);await page.locator('#open-coop').click();await page.waitForFunction(()=>document.querySelector('#coop-connection').textContent.includes('已连接'));}
async function purchase(page,id){await page.keyboard.press('f');await page.locator('#item-search').fill(id);await page.locator(`[data-item="${id}"]`).dblclick();await page.waitForFunction(id=>window.observedGame.player.inventory.includes(id),id);await page.keyboard.press('f');}
try{
  for(let i=0;i<5;i++){const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
    contexts.push(context);pages.push(page);page.on('pageerror',e=>errors.push(e.message));page.on('websocket',socket=>{socket.on('framesent',frame=>{try{const m=JSON.parse(frame.payload);if(m.type==='command')networkEvents.push({client:i,direction:'sent',id:m.id,action:m.action,args:m.args});}catch{}});socket.on('framereceived',frame=>{try{const m=JSON.parse(frame.payload);if(m.type==='ack'||m.type==='error')networkEvents.push({client:i,direction:'received',...m});else if(m.type==='welcome')networkEvents.push({client:i,direction:'received',type:'welcome',lastCommandId:m.lastCommandId});}catch{}});});await open(page);await page.locator('#coop-name').fill(`真人客户端 ${i+1}`);await page.locator('#coop-join-hero').selectOption(heroes[i]);}
  await pages[0].locator('#coop-create').click();await pages[0].waitForSelector('#coop-room-code');const code=await pages[0].locator('#coop-room-code').textContent();assert.match(code,/^[A-Z2-9]{6}$/);
  for(let i=1;i<4;i++){await pages[i].locator('#coop-code').fill(code);await pages[i].locator('#coop-join').click();await pages[i].waitForSelector('#coop-room-code');}
  for(let i=0;i<4;i++)await pages[i].locator('#coop-ready').click();
  assert.equal(await pages[0].locator('#coop-start').isDisabled(),true);assert.equal(await pages[0].locator('.coop-member:not(.coop-empty)').count(),4);assert.equal(await pages[0].locator('.coop-empty').count(),1);
  await pages[0].screenshot({path:'artifacts/coop-waiting-for-human.png'});check('Four ready clients wait for a real fifth player; no AI substitute or start button');
  await pages[4].locator('#coop-code').fill(code);await pages[4].locator('#coop-join').click();await pages[4].waitForSelector('#coop-room-code');await pages[4].locator('#coop-ready').click();
  await pages[0].waitForFunction(()=>!document.querySelector('#coop-start').disabled);await pages[0].screenshot({path:'artifacts/coop-five-ready.png'});await pages[0].locator('#coop-start').click();
  for(const page of pages)await page.waitForFunction(()=>window.observedGame?.isNetwork&&window.observedGame.player?.isHuman);
  const owners=await Promise.all(pages.map(p=>p.evaluate(()=>({id:window.observedGame.player.id,clientId:window.observedGame.player.clientId,hero:window.observedGame.player.heroId,humans:window.observedGame.entities.filter(e=>e.isHuman).length,local:window.observedGame.entities.filter(e=>e.isPlayer).length,bots:window.observedGame.entities.filter(e=>e.kind==='hero'&&e.team===1&&e.controller==='ai').length}))));
  assert.equal(new Set(owners.map(o=>o.id)).size,5);assert.equal(new Set(owners.map(o=>o.clientId)).size,5);assert.deepEqual(owners.map(o=>o.hero),heroes);assert.ok(owners.every(o=>o.humans===5&&o.local===1&&o.bots===5));check('Five isolated browser identities control distinct human heroes against five server AI');

  for(let i=0;i<5;i++){await pages[i].locator(`[data-learn="${i===0?2:0}"]`).click();await pages[i].waitForFunction(index=>window.observedGame.player.abilityLevels[index]===1,i===0?2:0);}
  const first=await pages[0].evaluate(()=>({x:window.observedGame.player.x,y:window.observedGame.player.y}));await pages[0].keyboard.down('ArrowRight');await pages[0].waitForFunction(x=>window.observedGame.player.x>x+20,first.x);await pages[0].keyboard.up('ArrowRight');
  await pages[0].waitForFunction(()=>window.observedGame.player.movementInput.x===0);
  const moved=await pages[0].evaluate(()=>({id:window.observedGame.player.id,x:window.observedGame.player.x}));await pages[3].waitForFunction(({id,x})=>Math.abs(window.observedGame.entities.find(e=>e.id===id).x-x)<1e-6,moved);
  await purchase(pages[0],'boots');await pages[4].waitForFunction(id=>window.observedGame.entities.find(e=>e.id===id).inventory.includes('boots'),owners[0].id);
  assert.equal(await pages[1].evaluate(()=>window.observedGame.player.inventory.length),0);
  await pages[0].keyboard.press('Alt+e');for(const page of pages)await page.waitForFunction(id=>window.observedGame.entities.find(e=>e.id===id).statuses.ogreBloodlust,owners[0].id);
  check('UI learning, independent movement, owned purchase and Bloodlust synchronize through the server');

  await pages[0].locator('#pause-button').click();const beforeMenu=await pages[1].evaluate(()=>window.observedGame.time);await pages[1].waitForFunction(t=>window.observedGame.time>t+.2,beforeMenu);assert.equal(await pages[1].evaluate(()=>window.observedGame.paused),false);await pages[0].locator('.modal-primary').click();check('One player opening a menu leaves the shared match running');

  const reserved=await pages[4].evaluate(()=>({id:window.observedGame.player.id,hero:window.observedGame.player.heroId,inventory:window.observedGame.player.inventory,levels:window.observedGame.player.abilityLevels}));
  await pages[4].reload({waitUntil:'networkidle'});await pages[0].waitForSelector('#coop-reconnecting');const frozen=await pages[0].evaluate(()=>window.observedGame.time);await pages[0].waitForTimeout(350);assert.equal(await pages[0].evaluate(()=>window.observedGame.time),frozen);
  assert.equal(await pages[0].evaluate(()=>window.observedGame.entities.filter(e=>e.isHuman).length),5);await pages[0].screenshot({path:'artifacts/coop-waiting-reconnect.png'});
  await closeDevelopmentNotice(pages[4]);await observe(pages[4]);await pages[4].locator('#open-coop').click();await pages[4].waitForFunction(()=>window.observedGame?.isNetwork&&!window.observedGame.paused);await pages[0].waitForFunction(()=>!window.observedGame.paused);
  const resumed=await pages[4].evaluate(()=>({id:window.observedGame.player.id,hero:window.observedGame.player.heroId,inventory:window.observedGame.player.inventory,levels:window.observedGame.player.abilityLevels}));assert.deepEqual(resumed,reserved);
  await purchase(pages[4],'branch');await pages[2].waitForFunction(id=>window.observedGame.entities.find(e=>e.id===id).inventory.includes('branch'),reserved.id);check('Refresh pauses for the reserved human, reopens the notice and restores the same hero; commands still work');
  await pages[0].screenshot({path:'artifacts/coop-playing.png'});await pages[0].setViewportSize({width:390,height:844});await pages[0].waitForTimeout(150);assert.equal(await pages[0].evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await pages[0].screenshot({path:'artifacts/coop-playing-390.png'});
  await pages[0].locator('#pause-button').click();await pages[0].locator('#back-lobby').click();for(const page of pages)await page.waitForSelector('#start-game');check('Leaving ends the five-human match for everyone; mobile has no overflow');
  assert.deepEqual(errors,[]);await writeFile('artifacts/coop-browser-report.json',JSON.stringify({checks,owners,errors},null,2));console.log(`Cooperative browser verification: ${checks.length} groups passed.`);
}catch(error){
  const states=await Promise.all(pages.map(async(page,i)=>{try{return await page.evaluate(i=>({client:i,toast:document.querySelector('#toast')?.textContent,status:document.querySelector('#coop-match-status')?.textContent,hero:window.observedGame?.player?.heroId,inventory:window.observedGame?.player?.inventory,gold:window.observedGame?.player?.gold,time:window.observedGame?.time,paused:window.observedGame?.paused}),i);}catch{return {client:i,closed:true};}}));
  await writeFile('artifacts/coop-browser-failure.json',JSON.stringify({states,networkEvents,errors},null,2));await pages.at(-1)?.screenshot({path:'artifacts/coop-browser-failure.png'});console.log(JSON.stringify({states,lastEvents:networkEvents.slice(-18)},null,2));throw error;
}finally{for(const context of contexts)await context.close();await browser.close();}
