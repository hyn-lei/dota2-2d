import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5184',{waitUntil:'networkidle'});
  await closeDevelopmentNotice(page);
  await page.evaluate(async()=>{
    const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
    Renderer.prototype.render=function(g,t){window.observedGame=g;window.observedRenderer=this;return render.call(this,window.tacticsGame||g,t);};
  });
  await page.locator('#start-game').click();await page.waitForFunction(()=>window.observedGame?.time>.2);
  const report=await page.evaluate(async()=>{
    const {Game}=await import('/src/engine.js'),Skills=await import('/src/hero-runtime.js');
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    function setup(team=0,count=1){
      const g=new Game({difficulty:'hard',seed:812});g.entities=[];
      const bots=Array.from({length:count},(_,i)=>g._makeHero(['axe','crystal_maiden','windranger'][i%3],team,1,false,i));
      const enemy=g._makeHero('axe',1-team,1,true,0);
      for(const [i,h] of [...bots,enemy].entries())Object.assign(h,{x:10400+i*90,y:10400,isHuman:h===enemy,
        aiTimer:h===enemy?Infinity:0,abilityLevels:[0,0,0,0],skillPoints:0,talentPoints:0,gold:0,
        hpRegen:0,manaRegen:0,mana:200,attackCooldown:999,botShop:{nextAt:Infinity,needsShop:false}});
      Object.assign(g,{nextWave:Infinity,nextNeutralSpawn:Infinity,roshanRespawnAt:Infinity,nextBuildingCheck:Infinity});
      for(const c of g.camps)c.nextSpawn=Infinity;
      g._index();return {g,bots,bot:bots[0],enemy};
    }
    function tower(g,team,x){const t=g._unit('tower',team,x,10400,{maxHp:1800,range:700,lane:2,tier:1,attackCooldown:999});g.entities.push(t);g._index();return t;}
    const defenses=[],fights=[];
    for(const team of [0,1]){
      const {g,bot,enemy}=setup(team),own=tower(g,team,15000);Object.assign(enemy,{x:15400,targetId:own.id});g._index();
      g.step(.1);const channel=bot.itemChannel?.targetId,consumed=bot.tp.length===0,mana=bot.mana;
      if(team===0){window.tacticsGame=g;window.observedRenderer.lookAt(bot.x,bot.y);window.observedRenderer.followPlayer=false;}
      g.step(3.2);defenses.push({team,channel,expected:own.id,consumed,mana,landed:distance(bot,own)<500,target:bot.targetId,enemy:enemy.id});
      const a=setup(team,2),ally=a.bots[1],support=tower(a.g,team,14700);
      Object.assign(ally,{x:15300,targetId:a.enemy.id});Object.assign(a.enemy,{x:15700,targetId:ally.id});a.g._index();
      a.g.step(.1);const mode=a.bot.botState.mode,tp=a.bot.itemChannel?.targetId;
      a.g.step(3.2);fights.push({team,mode,tp,expected:support.id,joined:a.bot.targetId===a.enemy.id});
    }
    const a=setup(1);a.enemy.x=a.bot.x+450;a.enemy.level=12;a.g._refreshHero(a.enemy);a.enemy.hp=a.enemy.maxHp;a.bot.tp=[];a.bot.tpMeta=[];a.g._index();
    const samples=[];for(let i=0;i<240;i++){a.g.step(.05);samples.push({x:a.bot.x,y:a.bot.y,mode:a.bot.botState.mode});}
    const tail=samples.slice(-60),retreat={mode:a.bot.botState.mode,distance:distance(a.bot,a.enemy),tailMovement:Math.max(...tail.map(p=>distance(p,tail[0])))};
    a.enemy.x+=3000;a.g._index();a.g.step(2);retreat.resumed=!a.bot.botState.safety;
    const b=setup();b.enemy.dead=true;b.enemy.hp=0;b.bot.tp=[];b.bot.tpMeta=[];const enemyTower=tower(b.g,1,b.bot.x+950);
    const waiting=[];for(let i=0;i<240;i++){b.g.step(.05);waiting.push({x:b.bot.x,y:b.bot.y});}
    const last=waiting.slice(-60),wave={mode:b.bot.botState.mode,minDistance:Math.min(...waiting.map(p=>distance(p,enemyTower))),tailMovement:Math.max(...last.map(p=>distance(p,last[0])))};
    const creep=b.g._unit('creep',0,enemyTower.x-300,10400,{maxHp:1000,speed:0,attackCooldown:999});b.g.entities.push(creep);b.g._index();b.g.step(1);
    wave.resumed=!b.bot.botState.safety&&b.bot.targetId===enemyTower.id;
    // Leave a real channelling support case on the Canvas for the screenshot.
    const picture=setup(0),own=tower(picture.g,0,15000);picture.enemy.x=15400;picture.enemy.targetId=own.id;picture.g._index();picture.g.step(.2);picture.g.paused=true;
    window.tacticsGame=picture.g;window.observedRenderer.lookAt(picture.bot.x,picture.bot.y);window.observedRenderer.followPlayer=false;
    return {defenses,fights,retreat,wave};
  });
  await writeFile('artifacts/ai-tactics-browser-report.json',JSON.stringify({...report,errors},null,2));
  assert.ok(report.defenses.every(r=>r.channel===r.expected&&r.consumed&&r.mana<200&&r.landed&&r.target===r.enemy),JSON.stringify(report.defenses));
  console.log('PASS Both teams pay for, channel and complete a distant tower-defense TP in the live engine');
  assert.ok(report.fights.every(r=>r.mode==='assist'&&r.tp===r.expected&&r.joined));
  console.log('PASS Both teams teleport to allied buildings and join forming fights');
  assert.ok(report.retreat.mode==='disengage'&&report.retreat.distance>800&&report.retreat.tailMovement<35&&report.retreat.resumed);
  console.log('PASS Twelve seconds of higher-level threat avoidance remain stable and resume after danger leaves');
  assert.ok(report.wave.mode==='wait-wave'&&report.wave.minDistance>800&&report.wave.tailMovement<35&&report.wave.resumed);
  console.log('PASS Waiting outside tower range stays stable, then resumes with the arriving creep wave');
  await page.waitForTimeout(150);await page.screenshot({path:'artifacts/ai-tactics-teleport.png'});
  assert.deepEqual(errors,[]);await writeFile('artifacts/ai-tactics-browser-report.json',JSON.stringify({...report,errors},null,2));
}finally{await browser.close();}
