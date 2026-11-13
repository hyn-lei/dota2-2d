import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],rounds=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('dialog',dialog=>dialog.accept());
const signature=heroes=>heroes.map(hero=>hero.heroId).sort().join(',');
async function observe() {
  await page.evaluate(async()=>{
    const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
    Renderer.prototype.render=function(game,time){window.draftGame=game;return render.call(this,game,time);};
    // Exercise the repeat guard across real page reloads, even with no seed entropy.
    Math.random=()=>42/4294967296;
  });
}
try {
  await page.goto(process.env.GAME_URL||'http://localhost:5184',{waitUntil:'networkidle'});
  for(let round=0; round<10; round++) {
    await closeDevelopmentNotice(page);await observe();
    await page.locator('[data-hero="juggernaut"]').click();await page.locator('#start-game').click();
    await page.waitForFunction(()=>window.draftGame?.player&&window.draftGame.time>.15);
    const result=await page.evaluate(()=>{
      const game=window.draftGame,heroes=game.entities.filter(hero=>hero.kind==='hero');
      return {allies:heroes.filter(hero=>hero.team===0&&!hero.isPlayer).map(hero=>({heroId:hero.heroId,lane:hero.lane,role:hero.draftRole})),
        enemies:heroes.filter(hero=>hero.team===1).map(hero=>({heroId:hero.heroId,lane:hero.lane,role:hero.draftRole})),
        player:{heroId:game.player.heroId,lane:game.player.lane,role:game.player.draftRole},
        history:JSON.parse(localStorage.getItem('af-ai-drafts-v1'))};
    });
    assert.equal(result.player.heroId,'juggernaut');assert.equal(result.allies.length,4);assert.equal(result.enemies.length,5);
    for(const heroes of [[result.player,...result.allies],result.enemies]) {
      assert.equal(new Set(heroes.map(hero=>hero.heroId)).size,5);
      assert.deepEqual([0,1,2].map(lane=>heroes.filter(hero=>hero.lane===lane).length),[2,1,2]);
    }
    if(round)for(const key of ['allies','enemies'])assert.notEqual(signature(result[key]),signature(rounds.at(-1)[key]));
    assert.equal(result.history.length,Math.min(round+1,6));rounds.push(result);
    await page.reload({waitUntil:'networkidle'});
  }
  const distinct=Object.fromEntries(['allies','enemies'].map(key=>[key,new Set(rounds.map(round=>signature(round[key]))).size]));
  assert.ok(distinct.allies>=7&&distinct.enemies>=7);
  const seen=Object.fromEntries(['allies','enemies'].map(key=>[key,[...new Set(rounds.flatMap(round=>round[key].map(hero=>hero.heroId)))].sort()]));
  assert.equal(seen.allies.length,6);assert.equal(seen.enemies.length,7);
  console.log('PASS Ten real new-game starts change both hero sets across reloads with a repeated seed; every AI hero appears');

  await closeDevelopmentNotice(page);await observe();
  const historyBefore=await page.evaluate(()=>localStorage.getItem('af-ai-drafts-v1'));
  await page.locator('#resume-game').click();await page.waitForFunction(()=>window.draftGame?.player);
  const resumed=await page.evaluate(()=>({heroes:window.draftGame.entities.filter(hero=>hero.kind==='hero').map(hero=>({heroId:hero.heroId,lane:hero.lane,role:hero.draftRole})),
    history:localStorage.getItem('af-ai-drafts-v1')}));
  assert.deepEqual(resumed.heroes,[rounds.at(-1).player,...rounds.at(-1).allies,...rounds.at(-1).enemies]);
  assert.equal(resumed.history,historyBefore);
  console.log('PASS Continuing a saved match retains heroes and roles without advancing draft history');
  await page.screenshot({path:'artifacts/ai-draft-match.png'});
  assert.deepEqual(errors,[]);
  await writeFile('artifacts/ai-draft-browser-report.json',JSON.stringify({rounds,distinct,seen,resumed,errors},null,2));
} finally {await browser.close();}
