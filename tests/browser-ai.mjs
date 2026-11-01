import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=name=>{checks.push(name);console.log(`PASS ${name}`);};
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5184',{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
    const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
    Renderer.prototype.render=function(g,t){window.observedGame=g;window.observedRenderer=this;return render.call(this,g,t);};
  });
  await page.locator('#difficulty').selectOption('hard');await page.locator('#start-game').click();
  await page.waitForFunction(()=>window.observedGame?.time>1);
  const opening=await page.evaluate(()=>{const g=window.observedGame;return {difficulty:g.difficulty,bots:g.entities.filter(e=>e.kind==='hero'&&!e.isPlayer).map(h=>h.inventory),player:g.player.inventory};});
  assert.equal(opening.difficulty,'hard');assert.equal(opening.bots.length,9);assert.ok(opening.bots.every(inv=>inv.includes('boots')));assert.equal(opening.player.length,0);
  check('All nine bots buy useful opening equipment without buying for the player');

  const report=await page.evaluate(async()=>{
    const {Game}=await import('/src/engine.js'),{BASES}=await import('/src/map-data.js');
    const Inventory=await import('/src/inventory.js'),Courier=await import('/src/courier.js');
    const g=window.observedGame;g.paused=true;
    const intervals=[];
    for(const difficulty of ['easy','normal','hard']){
      const match=new Game({difficulty}),bot=match.entities.find(h=>h.kind==='hero'&&h.team===1);bot.gold=0;match.step(.05);intervals.push(bot.aiTimer);
    }
    const routes=[];
    for(const hero of ['juggernaut','crystal_maiden','windranger','axe','ogre_magi','kunkka']){
      // Six heroes cannot all be drafted into the five opponent slots.
      const match=new Game({hero}),bot=match._makeHero(hero,1,1,false,0);Object.assign(bot,BASES[1]);bot.gold=15000;
      for(let i=0;i<15;i++){match.time+=.6;bot.aiTimer=0;match._botTick(bot,0);}
      routes.push({hero,equipment:bot.inventory.filter(Boolean),purchases:bot.botShop.purchases,spent:bot.botShop.spent});
    }
    const match=new Game({hero:'axe',difficulty:'hard'}),p=match.player,bot=match.entities.find(h=>h.kind==='hero'&&h.team===1&&h.heroId==='windranger');
    match.entities=[p,bot];match.nextWave=match.nextNeutralSpawn=match.roshanRespawnAt=Infinity;
    Object.assign(p,{x:10400,y:10400,hp:10000,maxHp:10000,hpRegen:0,attackCooldown:999,abilityLevels:[0,0,0,0],mana:0});
    Object.assign(bot,{x:10600,y:10400,abilityLevels:[4,4,4,3],skillPoints:0,gold:0,aiTimer:0,inventory:['black_king_bar'],mana:5000,maxMana:5000});Inventory.ensureInventory(bot);match._index();
    match.step(1.8);const fight={bkb:bot.inventoryMeta[0].cooldownRemaining,focus:bot.cooldowns[3],shackle:bot.cooldowns[0],targetHp:p.hp};
    const gearMatch=new Game({hero:'axe'}),carry=gearMatch._makeHero('juggernaut',1,1,false,0);
    gearMatch.time=1200;carry.level=25;carry.gold=100000;Object.assign(carry,BASES[1]);
    for(let i=0;i<400;i++){gearMatch.time+=.6;carry.aiTimer=0;gearMatch._botTick(carry,0);Courier.tickCouriers(gearMatch,.6);Inventory.tickInventory(gearMatch,carry);}
    const fullBuild={completed:carry.botShop.completed.length,shard:carry.consumedShard,scepter:carry.consumedScepter,boots:carry.inventory.some(id=>id&&id.includes('boots')),gold:carry.gold,purchases:carry.botShop.purchases};
    // Keep a live combat sample on the real battlefield for inspection.
    g.entities=[g.player,bot];Object.assign(g.player,{x:10400,y:10400});g.effects=match.effects;g.paused=true;
    window.observedRenderer.lookAt(10400,10400);window.observedRenderer.followPlayer=false;
    return {intervals,routes,fight,fullBuild};
  });
  assert.ok(report.intervals[0]<=.45&&report.intervals[0]>report.intervals[1]&&report.intervals[1]>report.intervals[2]);check('Every difficulty has faster decisions with an ordered strength gradient');
  assert.ok(new Set(report.routes.map(r=>r.equipment.join('|'))).size>=4);assert.ok(report.routes.every(r=>r.purchases>=5));check('Each hero advances its own multi-stage build');
  assert.ok(report.fight.bkb>0&&report.fight.focus>0&&report.fight.shackle>0&&report.fight.targetHp<10000);check('Enemy Windranger activates BKB and combines control, focus and actual damage');
  assert.ok(report.fullBuild.completed>=11&&report.fullBuild.shard&&report.fullBuild.scepter&&report.fullBuild.boots&&report.fullBuild.gold>=0);check('Secret-shop courier trips, full slots and permanent upgrades continue working');
  await page.waitForTimeout(100);await page.screenshot({path:'artifacts/ai-combat.png'});
  assert.deepEqual(errors,[]);await writeFile('artifacts/ai-browser-report.json',JSON.stringify({checks,...report,errors},null,2));
  console.log(`Browser AI verification: ${checks.length} groups passed.`);
}finally{await browser.close();}
