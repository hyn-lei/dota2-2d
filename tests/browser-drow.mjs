import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { closeDevelopmentNotice } from './browser-helpers.mjs';
const url=process.env.GAME_URL||'http://localhost:5184';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(url,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 assert.equal(await page.locator('.hero-option').count(),7);await page.locator('[data-hero="drow_ranger"]').click();
 await page.waitForFunction(()=>document.querySelector('#hero-render')?.complete&&document.querySelector('#hero-render').naturalWidth>0);
 await page.screenshot({path:'artifacts/drow-lobby.png'});
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.drowRenderer=this;window.observedDrowGame=g;return render.call(this,window.drowScene||g,window.drowScene?.time??t);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.observedDrowGame?.time>.1);
 assert.equal(await page.locator('#ability-3 .ability-name').textContent(),'射手天赋');
 await page.locator('[data-learn="0"]').click();await page.waitForFunction(()=>window.observedDrowGame.player.abilityLevels[0]===1);
 await page.locator('#ability-0').hover();assert.match(await page.locator('.skill-tooltip').textContent(),/625/);
 await page.locator('#ability-0').click({button:'right'});await page.waitForFunction(()=>window.observedDrowGame.player.autocast[0]===false);
 const report=await page.evaluate(async()=>{
  const {Game}=await import('/src/engine.js'),{unitOpacity,unitVisuals}=await import('/src/combat-visuals.js'),{drawUnitCombatEffects,drawCombatEffect}=await import('/src/combat-effects.js');
  const check=(ok,message)=>{if(!ok)throw Error(message);};window.observedDrowGame.paused=true;
  function scene(hero='drow_ranger'){
   const g=new Game({hero}),p=g.player,e=g._makeHero('crystal_maiden',1,1,false,0);g.entities=[p,e];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
   Object.assign(p,{x:10400,y:10400,abilityLevels:[4,4,4,3],attackCooldown:999,hpRegen:0,manaRegen:0});
   Object.assign(e,{x:p.x+500,y:p.y,maxHp:10000,hp:10000,armor:0,magicResistance:0,speed:0,hpRegen:0,attackCooldown:999,aiTimer:Infinity,abilityLevels:[0,0,0,0],cooldowns:[999,999,999,999]});g._index();g.step(.05);p.hpRegen=p.manaRegen=0;p.mana=p.maxMana=3000;return {g,p,e};
  }
  const renderer=window.drowRenderer,tiles=[];
  const frost=scene();frost.p.attackCooldown=0;frost.g._attack(frost.p,frost.e,{attackReleased:true});frost.p.attackCooldown=999;frost.g.step(.2);
  check(frost.e.hp===10000&&!frost.e.statuses.drowFrost,'frost flight has no early damage or slow');check(frost.g.effects.some(f=>f.visual==='drowFrostArrow'),'distinct frost arrow');tiles.push({label:'卓尔游侠 · 冰箭在飞行中',...frost,center:{x:10650,y:10400}});
  const gust=scene();gust.g.cast(1,gust.e);gust.g.step(.42);check(gust.g.effects.some(f=>f.visual==='drowGust'),'gust has visible traveling front');check(!gust.e.statuses.drowGustSilence,'gust does not silence before contact');tiles.push({label:'狂风 · 飞行波面',...gust,center:{x:10650,y:10400}});
  const multi=scene();multi.g.cast(2,multi.e);multi.g.step(.3);check(multi.p.channel?.kind==='multishot','multishot channel');check(multi.g.effects.filter(f=>f.visual==='drowMultishot').length>=3,'multishot has separate arrows');tiles.push({label:'多重射击 · 连续箭矢',...multi,center:{x:10650,y:10400}});
  const ice=scene();ice.p.hasShard=true;ice.g.castExtra('drow_ranger_glacier',ice.p);ice.g.step(.2);check(ice.g.itemZones.some(z=>z.type==='drowGlacier'),'glacier simulation exists');tiles.push({label:'冰川 · 魔晶高地',...ice,center:{x:10400,y:10400}});
  const hunger=scene('axe');hunger.g.cast(1,hunger.e);hunger.g.step(.4);check(unitVisuals(hunger.e,hunger.g.time).includes('hunger'),'actual Hunger state');tiles.push({label:'战斗饥渴 · 放大标记与持续红光',...hunger,center:{x:hunger.e.x,y:hunger.e.y}});
  const fades=[];
  for(const time of [0,.25,.5]){const a=scene('crystal_maiden');a.p.inventory=['glimmer_cape'];a.g._refreshHero(a.p);a.p.mana=a.p.maxMana;a.p.hpRegen=a.p.manaRegen=0;a.g.useItem(0,a.p);a.g.step(time);
   fades.push(unitOpacity(a.p,a.g.time));tiles.push({label:`微光披风 · ${time.toFixed(2)} 秒`,...a,center:{x:a.p.x,y:a.p.y}});}
  check(fades[0]===1&&fades[1]<fades[0]&&fades[2]<fades[1],'glimmer progressively fades');
  const tower=scene();const t=tower.g._unit('tower',1,tower.p.x+600,tower.p.y,{range:700,damage:50,attackCooldown:0,speed:0});tower.g.entities.push(t);tower.g._index();const hp=tower.p.hp;tower.g._attack(t,tower.p);t.attackCooldown=999;tower.g.step(.4);
  check(tower.p.hp===hp&&!tower.g.effects.some(f=>f.visual==='attackImpact'),'tower flight has no early damage or impact');tiles.push({label:'防御塔 · 750 弹速，飞行中不扣血',...tower,center:{x:10650,y:10400}});
  function draw(c,tile,zoom=.5){
   c.fillStyle='#213a33';c.fillRect(0,0,420,290);c.save();c.translate(210,190);c.scale(zoom,zoom);c.translate(-tile.center.x,-tile.center.y);
   for(const e of tile.g.entities){drawUnitCombatEffects(c,e,tile.g,zoom,'ground');if(e.kind!=='tower')renderer.drawUnit(c,e,tile.g,tile.g.time);drawUnitCombatEffects(c,e,tile.g,zoom,'above');}
   for(const fx of tile.g.effects)drawCombatEffect(c,fx,tile.g,zoom);c.restore();
  }
  const panel=document.createElement('section');panel.id='drow-evidence';panel.style.cssText='position:absolute;left:0;top:0;width:1366px;background:#111e1b;padding:22px;box-sizing:border-box;z-index:500;color:#e4ecdd;font:16px Segoe UI,Microsoft YaHei,sans-serif';
  const title=document.createElement('h2');title.textContent='技能特效与实际弹道 · 7.41f';panel.append(title);const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:12px';panel.append(grid);
  for(const tile of tiles){tile.g.paused=true;const cell=document.createElement('div'),label=document.createElement('p');label.textContent=tile.label;label.style.cssText='margin:12px 10px';cell.append(label);const canvas=document.createElement('canvas');canvas.width=420;canvas.height=290;canvas.style.cssText='width:100%;display:block';cell.append(canvas);grid.append(cell);draw(canvas.getContext('2d'),tile);}
  document.body.append(panel);
  const probe=document.createElement('canvas');probe.width=420;probe.height=290;const ctx=probe.getContext('2d');ctx.save();ctx.translate(210,190);ctx.scale(.18,.18);ctx.translate(-hunger.e.x,-hunger.e.y);drawUnitCombatEffects(ctx,hunger.e,hunger.g,.18,'above');ctx.restore();const bytes=ctx.getImageData(0,0,420,290).data;let red=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i]>120&&bytes[i]>bytes[i+1]*1.2&&bytes[i]>bytes[i+2]*1.3&&bytes[i+3]>80)red++;check(red>=12,'Hunger retains visible red pixels at minimum zoom');
  const blank=()=>probe.toDataURL();draw(ctx,tiles[6]);const frame=blank();draw(ctx,tiles[6]);check(blank()===frame,'paused glimmer pixels are stable');
  const cancelled=scene();cancelled.p.attackCooldown=0;cancelled.g._attack(cancelled.p,cancelled.e,{attackReleased:true});cancelled.p.attackCooldown=999;cancelled.e.projectileDisjoint=1;cancelled.g.step(.8);check(cancelled.e.hp===10000&&!cancelled.e.statuses.drowFrost&&!cancelled.g.effects.some(f=>f.visual==='drowFrostImpact'),'disjoint removes flight with no impact');
  tower.g.paused=false;tower.g.step(.5);check(tower.p.hp<hp&&tower.g.effects.some(f=>f.visual==='attackImpact'),'tower impact and damage occur together');
  window.drowScene=multi.g;window.drowScene.paused=true;renderer.followPlayer=false;renderer.zoom=.45;renderer.lookAt(10600,10400);
  return {checks:['Drow selection, official art and skill HUD','Frost/Gust travel before damage or disable','Separate Multishot arrows and channel','Shard Glacier render and simulation','Hunger visible at minimum zoom','Glimmer 0/.25/.5 progressive opacity and pause','Tower flight and impact synchronization','Disjoint leaves no damage, slow or impact'],fadeOpacity:fades,tileCount:tiles.length};
 });
 await page.locator('#drow-evidence').screenshot({path:'artifacts/drow-vfx-evidence.png'});
 await page.evaluate(()=>document.querySelector('#drow-evidence').remove());await page.waitForTimeout(100);await page.screenshot({path:'artifacts/drow-combat-1366.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.drowRenderer.zoom=.18);await page.waitForTimeout(100);await page.screenshot({path:'artifacts/drow-combat-390.png'});
 assert.deepEqual(errors,[]);await writeFile('artifacts/drow-browser-report.json',JSON.stringify({...report,errors},null,2));console.log(`Drow browser verification: ${report.checks.length} groups, ${report.tileCount} real effect tiles.`);
}finally{await browser.close();}
