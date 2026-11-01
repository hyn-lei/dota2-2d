import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createCoopServer } from '../server/coop-server.mjs';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

let service,base=process.env.GAME_URL;
if(!base){service=createCoopServer({root:process.cwd(),host:'127.0.0.1',port:0});await service.listen();base=`http://127.0.0.1:${service.server.address().port}`;}
await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({headless:true});
const contexts=[],pages=[],errors=[];
async function open(context){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
  assert.equal(await page.locator('#open-matchmaking').count(),1);
  await page.evaluate(async()=>{
    const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;let last=-Infinity;
    Renderer.prototype.render=function(game,time){if(game)window.observedGame=game;const now=performance.now();if(now-last<200)return;last=now;return render.call(this,game,time);};
    const {CoopConnection}=await import('/src/coop-connection.js'),connect=CoopConnection.prototype.connect;
    CoopConnection.prototype.connect=function(){window.observedConnection=this;return connect.call(this);};
  });
  await page.locator('#open-matchmaking').click();await page.waitForFunction(()=>document.querySelector('#coop-connection').textContent.includes('已连接'));
  return page;
}
async function queue(page,index){
  if(index!==4)await page.locator('#coop-name').fill(`随机真人 ${index+1}`);
  await page.locator('#coop-join-hero').selectOption('ogre_magi');await page.locator('#coop-match-start').click();
}
try{
  const quotaContext=await browser.newContext({viewport:{width:1366,height:768}}),quotaPage=await open(quotaContext);
  await quotaPage.evaluate(async()=>{
    const next=status=>new Promise(resolve=>{
      const handler=e=>{if(e.detail.status===status){window.observedConnection.removeEventListener('matchmaking',handler);resolve();}};
      window.observedConnection.addEventListener('matchmaking',handler);
    });
    for(let i=0;i<2;i++){
      const queued=next('queued');document.querySelector('#coop-match-start').click();await queued;
      const canceled=next('canceled');document.querySelector('#coop-match-cancel').click();await canceled;
    }
    await new Promise(resolve=>setTimeout(resolve,600));
    const queued=next('queued');document.querySelector('#coop-match-start').click();await queued;
    document.querySelector('#coop-match-cancel').click();
  });
  await quotaPage.waitForSelector('#coop-match-start:visible',{timeout:3000});
  assert.equal(await quotaPage.locator('#coop-matchmaking').isVisible(),false);
  console.log('PASS A rate-limited cancellation is retried and confirmed without leaving a queued human behind');
  for(let i=0;i<5;i++){const context=await browser.newContext({viewport:{width:1366,height:768}});contexts.push(context);pages.push(await open(context));}
  for(let i=0;i<4;i++){
    await queue(pages[i],i);await pages[i].waitForFunction(count=>document.querySelector('#coop-match-count').textContent===`真人 ${count}/5`,i+1);
    assert.equal(await pages[i].locator('.match').count(),0);
  }
  await pages[0].locator('#coop-match-cancel').click();await pages[0].waitForSelector('#coop-match-start:visible');
  await pages[1].waitForFunction(()=>document.querySelector('#coop-match-count').textContent==='真人 3/5');
  await queue(pages[0],0);await pages[0].waitForFunction(()=>document.querySelector('#coop-match-count').textContent==='真人 4/5');
  await pages[2].close();await pages[0].waitForFunction(()=>document.querySelector('#coop-match-count').textContent==='真人 3/5');
  pages[2]=await open(contexts[2]);await queue(pages[2],2);await pages[2].waitForFunction(()=>document.querySelector('#coop-match-count').textContent==='真人 4/5');
  console.log('PASS Queue count uses online humans; cancellation and closed tabs remove their slots');
  await queue(pages[4],4);
  for(const page of pages)await page.waitForFunction(()=>window.observedGame?.isNetwork&&window.observedGame.player?.isHuman);
  const states=await Promise.all(pages.map(page=>page.evaluate(()=>({playerId:window.observedGame.player.id,heroId:window.observedGame.player.heroId,name:window.observedGame.player.playerName,humans:window.observedGame.entities.filter(e=>e.isHuman).map(e=>({id:e.id,controller:e.controller,heroId:e.heroId})),status:document.querySelector('#coop-match-status').textContent}))));
  assert.equal(new Set(states.map(s=>s.playerId)).size,5);assert.equal(new Set(states.map(s=>s.heroId)).size,5);
  assert.ok(states.every(s=>s.humans.length===5&&s.humans.every(h=>h.controller==='human')&&s.status.includes('随机匹配')));
  assert.match(states[4].name,/玩家/);
  console.log('PASS The fifth click automatically starts five distinct human heroes, including duplicate preferred heroes');

  await pages[0].locator('[data-learn="0"]').click();await pages[0].waitForFunction(()=>window.observedGame.player.abilityLevels[0]===1);
  await pages[0].keyboard.press('f');await pages[0].locator('#item-search').fill('branch');await pages[0].locator('[data-item="branch"]').dblclick();
  await pages[0].waitForFunction(()=>window.observedGame.player.inventory.includes('branch'));await pages[0].keyboard.press('f');
  assert.deepEqual(await pages[1].evaluate(()=>window.observedGame.player.inventory),[]);
  await pages[1].waitForFunction(id=>window.observedGame.entities.find(e=>e.id===id)?.inventory.includes('branch'),states[0].playerId);
  console.log('PASS Randomly matched players own independent skills and items with shared authoritative snapshots');

  await pages[4].close();await pages[0].waitForSelector('#coop-reconnecting');
  pages[4]=await open(contexts[4]);await pages[4].waitForFunction(id=>window.observedGame?.player.id===id,states[4].playerId);
  assert.equal(await pages[4].evaluate(()=>window.observedGame.player.id),states[4].playerId);
  console.log('PASS Reopening restores the reserved matched hero without entering the queue again');
  await pages[0].locator('#pause-button').click();await pages[0].locator('#back-lobby').click();
  for(const page of pages)await page.waitForSelector('#open-matchmaking');
  for(const viewport of [{width:1366,height:768},{width:768,height:1024},{width:390,height:844}]){
    await pages[0].setViewportSize(viewport);await pages[0].locator('#open-matchmaking').scrollIntoViewIfNeeded();
    assert.equal(await pages[0].evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await pages[0].locator('#open-matchmaking').click();await pages[0].waitForSelector('#coop-match-start');
    await pages[0].screenshot({path:`artifacts/matchmaking-${viewport.width}.png`});await pages[0].locator('#coop-close').click();
  }
  assert.deepEqual(errors,[]);console.log('PASS Both multiplayer modes remain usable across desktop, tablet and mobile');
}finally{await browser.close();await service?.close();}
