import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createCoopServer } from '../server/coop-server.mjs';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

let service,base=process.env.GAME_URL;
if(!base){service=createCoopServer({root:process.cwd(),host:'127.0.0.1',port:0});await service.listen();base=`http://127.0.0.1:${service.server.address().port}`;}
await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({headless:true}),errors=[];
const observe=page=>page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;let last=0;
  Renderer.prototype.render=function(game,time){if(game)window.observedGame=game;const now=performance.now();if(now-last<150)return;last=now;return render.call(this,game,time);};
});
async function open(context){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);await observe(page);return page;
}
const connected=page=>page.waitForFunction(()=>document.querySelector('#coop-connection')?.textContent.includes('已连接'));
try{
  for(const viewport of [{width:1366,height:768},{width:1024,height:576},{width:768,height:1024},{width:390,height:844}]){
    const context=await browser.newContext({viewport}),page=await open(context);
    for(const id of ['quick-matchmaking','quick-coop-room']){
      assert.equal(await page.locator('#'+id).count(),1);
      assert.equal(await page.locator('#'+id).evaluate(button=>{
        const r=button.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
      }),true);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`artifacts/ai-room-lobby-${viewport.width}.png`});
    await page.locator('#quick-matchmaking').click();await connected(page);assert.equal(await page.locator('#coop-fill-ai').count(),0);
    await page.locator('#coop-close').click();await page.locator('#quick-coop-room').click();await connected(page);
    assert.equal(await page.locator('#coop-fill-ai').isChecked(),true);
    await context.close();
  }
  console.log('PASS Direct matching and room shortcuts are clickable in the first viewport at four screen sizes');

  const solo=await browser.newContext({viewport:{width:1366,height:768}}),page=await open(solo);
  await page.locator('#quick-coop-room').click();await connected(page);await page.locator('#coop-name').fill('Solo human');
  await page.locator('#coop-join-hero').selectOption('ogre_magi');await page.locator('#coop-create').click();await page.waitForSelector('#coop-room-code');
  assert.equal(await page.locator('.coop-ai').count(),4);await page.locator('#coop-ready').click();await page.locator('#coop-start').click();
  await page.waitForFunction(()=>window.observedGame?.isNetwork&&window.observedGame.entities.filter(e=>e.isHuman).length===1);
  const firstId=await page.evaluate(()=>window.observedGame.player.id);
  assert.equal(await page.evaluate(()=>window.observedGame.entities.filter(e=>e.kind==='hero'&&e.team===0&&e.controller==='ai'&&e.aiDifficulty==='hard').length),4);
  assert.equal(await page.locator('.roster-ai-label').count(),4);
  assert.match(await page.locator('#coop-match-status').textContent(),/困难 AI 4/);
  await page.waitForFunction(()=>window.observedGame.entities.filter(e=>e.kind==='hero'&&e.team===0&&!e.isHuman).every(e=>e.inventory.length>0&&e.abilityLevels.some(r=>r>0)));
  await page.locator('[data-learn="0"]').click();await page.waitForFunction(()=>window.observedGame.player.abilityLevels[0]===1);
  await page.reload({waitUntil:'networkidle'});await closeDevelopmentNotice(page);await observe(page);
  await page.locator('#quick-coop-room').click();await page.waitForFunction(id=>window.observedGame?.player.id===id&&window.observedGame.isNetwork,firstId);
  assert.equal(await page.evaluate(()=>window.observedGame.player.abilityLevels[0]),1);
  assert.equal(await page.evaluate(()=>window.observedGame.entities.filter(e=>e.isHuman).length),1);
  console.log('PASS One real human plays with four hard AI allies and reconnects to the same human hero');
  await solo.close();

  const ownerContext=await browser.newContext(),guestContext=await browser.newContext(),owner=await open(ownerContext),guest=await open(guestContext);
  for(const p of [owner,guest]){await p.locator('#quick-coop-room').click();await connected(p);}
  await owner.locator('#coop-name').fill('Owner');await owner.locator('#coop-join-hero').selectOption('ogre_magi');await owner.locator('#coop-create').click();
  const code=await owner.locator('#coop-room-code').textContent();
  await guest.locator('#coop-name').fill('Classmate');await guest.locator('#coop-join-hero').selectOption('juggernaut');await guest.locator('#coop-code').fill(code);await guest.locator('#coop-join').click();
  await owner.waitForFunction(()=>document.querySelectorAll('.coop-ai').length===3);
  for(const p of [owner,guest])await p.locator('#coop-ready').click();await owner.locator('#coop-start').click();
  for(const p of [owner,guest])await p.waitForFunction(()=>window.observedGame?.isNetwork&&window.observedGame.entities.filter(e=>e.isHuman).length===2);
  assert.notEqual(await owner.evaluate(()=>window.observedGame.player.id),await guest.evaluate(()=>window.observedGame.player.id));
  await guest.keyboard.press('f');await guest.locator('#item-search').fill('branch');await guest.locator('[data-item="branch"]').dblclick();await guest.waitForFunction(()=>window.observedGame.player.inventory.includes('branch'));
  assert.deepEqual(await owner.evaluate(()=>window.observedGame.player.inventory),[]);
  console.log('PASS Two real sessions play independently with three hard AI allies');
  await ownerContext.close();await guestContext.close();

  const pureContext=await browser.newContext(),pure=await open(pureContext);
  await pure.locator('#quick-coop-room').click();await connected(pure);await pure.locator('#coop-name').fill('Pure human room');await pure.locator('#coop-fill-ai').uncheck();await pure.locator('#coop-create').click();await pure.waitForSelector('#coop-room-code');await pure.locator('#coop-ready').click();
  assert.equal(await pure.locator('.coop-ai').count(),0);assert.equal(await pure.locator('#coop-start').isDisabled(),true);
  await pureContext.close();assert.deepEqual(errors,[]);
  console.log('PASS Disabling AI fill retains the five-human rule and no browser errors');
}finally{await browser.close();await service?.close();}
