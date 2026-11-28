import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
const scenario=process.argv.includes('--scenario')?process.argv[process.argv.indexOf('--scenario')+1]:'all';
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(process.env.GAME_URL||'http://127.0.0.1:5184/')&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184/',{waitUntil:'networkidle'});
 await closeDevelopmentNotice(page);
 assert.equal(await page.locator('[data-hero="weaver"]').count(),1,'Weaver is available in the playable roster');
 await page.locator('[data-hero="weaver"]').click();
 await page.waitForFunction(()=>document.querySelector('#hero-render')?.complete&&document.querySelector('#hero-render').naturalWidth>0);
 await page.screenshot({path:'artifacts/weaver-lobby.png'});
 await page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
  Renderer.prototype.render=function(g,t){window.weaverRenderer=this;window.weaverGame=g;return render.call(this,g,t);};
 });
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.weaverGame?.time>.1);
 await page.evaluate(()=>window.weaverGame.paused=true);
 assert.equal(await page.locator('#ability-0 .ability-name').textContent(),'虫群');
 assert.equal(await page.locator('#ability-1 .ability-name').textContent(),'缩地');
 assert.equal(await page.locator('#ability-2 .ability-name').textContent(),'连击');
 assert.equal(await page.locator('#ability-3 .ability-name').textContent(),'时光倒流');
 await page.locator('[data-hero-upgrade="scepter"]').hover();
 assert.match(await page.locator('.hero-upgrade-tooltip').textContent(),/时光倒流|冷却/);
 await page.locator('[data-hero-upgrade="shard"]').hover();
 assert.match(await page.locator('.hero-upgrade-tooltip').textContent(),/缩地|连击/);
 const report=await page.evaluate(async(scenario)=>{
  const {Game}=await import('/src/engine.js');
  const {drawUnitCombatEffects,drawCombatEffect}=await import('/src/combat-effects.js');
  const {unitOpacity}=await import('/src/combat-visuals.js');
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  function arena(){
   const g=new Game({hero:'weaver'}),p=g.player,e=g._makeHero('axe',1,1,false,0);
   g.entities=[p,e];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
   Object.assign(p,{x:10400,y:10400,abilityLevels:[4,4,4,3],attackCooldown:999});
   Object.assign(e,{x:10500,y:10400,maxHp:50000,hp:50000,armor:0,magicResistance:0,speed:0,aiTimer:Infinity,attackCooldown:999,abilityLevels:[0,0,0,0],cooldowns:[999,999,999,999]});
   g._index();g.step(.02);p.mana=p.maxMana=5000;return {g,p,e};
  }
  const tiles=[];
  if(scenario==='all'||scenario==='shukuchi'){
  const sh=arena();check(sh.g.cast(1).ok,'Shukuchi casts');sh.g.step(.125);
  const halfway=unitOpacity(sh.p,sh.g.time);sh.g.step(.13);const invisible=unitOpacity(sh.p,sh.g.time);
  check(halfway<1&&invisible<halfway,'Shukuchi progressively fades during .25s');
  check(sh.e.hp<50000,'Shukuchi contact damages an enemy');tiles.push({label:'缩地 · 渐隐与穿越',...sh});
  }
  if(scenario==='all'||scenario==='swarm'){
  const sw=arena();sw.e.x+=400;check(sw.g.cast(0,sw.e).ok,'Swarm casts');sw.g.step(.8);
  check(sw.g.entities.some(e=>e.kind==='weaverBeetle'&&!e.dead),'Swarm creates real beetle units');tiles.push({label:'虫群 · 飞行中的甲虫',...sw});
  }
  if(scenario==='all'||scenario==='threads'){
  const th=arena();th.p.attackCooldown=0;th.g._attack(th.p,th.e,{attackReleased:true});th.p.attackCooldown=999;th.g.step(1.5);
  check(th.p.weaverThreads?.some(t=>t.phase==='established'),'Threads establishes from actual damage');tiles.push({label:'命运之线 · 已建立连线',...th});
  }
  if(scenario==='all'||scenario==='geminate'){
  const ga=arena();ga.p.attackCooldown=0;ga.g._attack(ga.p,ga.e,{attackReleased:true});ga.p.attackCooldown=999;ga.g.step(.27);
  check(ga.g.effects.some(f=>f.type==='projectile'&&f.visual==='weaverGeminate'),'Geminate dispatches a distinct extra projectile');tiles.push({label:'连击 · 延迟的额外弹道',...ga});
  }
  if(scenario==='all'||scenario==='time-lapse'){
  const tl=arena();tl.g.step(5.1);tl.p.x+=700;tl.p.hp=100;tl.g._index();check(tl.g.cast(3).ok,'Time Lapse casts');tl.g.step(.31);
  check(tl.g.effects.some(f=>f.visual==='weaverTimeLapse'),'Time Lapse emits a rewind effect');tiles.push({label:'时光倒流 · 回溯路径',...tl});
  }
  const host=document.createElement('div');host.id='weaver-evidence';host.style.cssText='position:absolute;inset:0 auto auto 0;width:1366px;background:#14242b;padding:22px;color:#e7eced;z-index:1000;font:16px Microsoft YaHei,sans-serif;box-sizing:border-box';
  const title=document.createElement('h2');title.textContent='编织者 · 7.42 技能实际状态';host.append(title);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:12px';host.append(grid);
  for(const tile of tiles){
   const cell=document.createElement('div'),label=document.createElement('p'),canvas=document.createElement('canvas');label.textContent=tile.label;canvas.width=420;canvas.height=300;cell.append(label,canvas);grid.append(cell);
   const c=canvas.getContext('2d'),draw=()=>{
    c.resetTransform();c.clearRect(0,0,420,300);c.fillStyle='#21343a';c.fillRect(0,0,420,300);c.save();c.translate(125,200);c.scale(.42,.42);c.translate(-tile.p.x,-tile.p.y);
    for(const e of tile.g.entities)if(!e.dead){drawUnitCombatEffects(c,e,tile.g,.42,'ground');window.weaverRenderer.drawUnit(c,e,tile.g,tile.g.time);drawUnitCombatEffects(c,e,tile.g,.42,'above');}
    for(const f of tile.g.effects)drawCombatEffect(c,f,tile.g,.42);c.restore();
   };
   draw();const frame=canvas.toDataURL();draw();check(canvas.toDataURL()===frame,'Paused Weaver effects remain pixel stable');
  }
  document.body.append(host);
  const g=window.weaverGame,p=g.player;p.hasScepter=true;p.abilityLevels=[4,4,4,3];p.cooldowns=[0,0,0,0];p.mana=p.maxMana;
  return {scenario,tiles:tiles.length,heroes:g.entities.filter(e=>e.kind==='hero').length};
 },scenario);
 await page.locator('#weaver-evidence').screenshot({path:'artifacts/weaver-effects.png'});
 await page.evaluate(()=>document.querySelector('#weaver-evidence').remove());
 await page.waitForSelector('[data-extra="weaver_time_lapse_ally"]');
 assert.equal(await page.locator('[data-extra="weaver_time_lapse_ally"] kbd').textContent(),'D');
 if(scenario==='all'||scenario==='controls'){
  const point=await page.evaluate(()=>{
   const g=window.weaverGame,p=g.player,e=g._makeHero('axe',1,1,false,0);
   g.entities=[p,e];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
   Object.assign(p,{x:11200,y:11200,abilityLevels:[4,4,4,3],cooldowns:[0,0,0,0],attackCooldown:0,statuses:{},destination:null,targetId:null,explicitTarget:null});
   Object.assign(e,{x:p.x+200,y:p.y,hp:50000,maxHp:50000,attackCooldown:999,aiTimer:Infinity,speed:0,abilityLevels:[0,0,0,0]});
   p.autocast[2]=true;p.hasScepter=true;p.mana=p.maxMana=5000;g._index();g.paused=false;
   const cast=g.cast;g.cast=function(...args){const result=cast.apply(this,args);window.lastWeaverCast={args,result};return result;};
   window.weaverRenderer.followPlayer=false;window.weaverRenderer.zoom=.45;window.weaverRenderer.lookAt(p.x,p.y);
   const point=window.weaverRenderer.worldToScreen(e.x,e.y),bounds=document.querySelector('#battlefield').getBoundingClientRect();
   return {x:point.x+bounds.left,y:point.y+bounds.top};
  });
  await page.locator('#ability-2').click({button:'right'});
  await page.waitForFunction(()=>window.weaverGame.player.autocast[2]===false);
  await page.locator('#battlefield').focus();await page.mouse.move(20,200);
  await page.waitForFunction(()=>[...document.querySelectorAll('.skill-tooltip,.hero-upgrade-tooltip')].every(e=>e.hidden));
  await page.mouse.move(point.x,point.y,{steps:2});
  await page.keyboard.down('ArrowLeft');await page.keyboard.press('e');
  try{await page.waitForFunction(()=>window.weaverGame.player.cooldowns[2]>0,{},{timeout:4000});}
  catch(error){console.log(JSON.stringify(await page.evaluate(()=>{const g=window.weaverGame,p=g.player;return {cast:window.lastWeaverCast,time:g.time,paused:g.paused,x:p.x,y:p.y,phase:p.attackPhase,cd:p.cooldowns,manual:p.weaverManualGeminateTarget,target:p.targetId,toast:document.querySelector('#toast')?.textContent,entities:g.entities.map(e=>({id:e.id,x:e.x,y:e.y}))};})));throw error;}
  await page.keyboard.up('ArrowLeft');
  await page.evaluate(()=>{const g=window.weaverGame,p=g.player;g.clearMovement(p);p.cooldowns[3]=0;p.extraCooldowns={weaver_time_lapse_ally:0};p.hasScepter=true;});
  await page.keyboard.press('Alt+d');
  await page.waitForFunction(()=>window.weaverGame.player.cooldowns[3]>0,{},{timeout:4000});
  await page.evaluate(()=>window.weaverGame.paused=true);report.controls='Right-click autocast, manual E while moving, Alt+D self rewind';
 }
 await page.screenshot({path:'artifacts/weaver-hud.png'});
 assert.deepEqual(errors,[]);await writeFile('artifacts/weaver-browser-report.json',JSON.stringify({...report,errors},null,2));
 console.log(`PASS Weaver lobby, four skills, upgrades, allied D and ${report.tiles} real combat effect scenes`);
}finally{await browser.close();}
