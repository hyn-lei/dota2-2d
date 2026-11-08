import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],checks=[];
const check=message=>{checks.push(message);console.log('PASS '+message);};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await mkdir('artifacts',{recursive:true});
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5193',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render,fill=CanvasRenderingContext2D.prototype.fillText;
  window.criticalDraws=[];Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(/^\d+!$/.test(text)&&criticalDraws.length<500)criticalDraws.push({text,color:this.fillStyle,font:this.font});return fill.call(this,text,...args);};
 });
 await page.locator('[data-hero="kunkka"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
 await page.evaluate(()=>{
  const p=g.player,e=g._makeHero('crystal_maiden',1,0,false,0),c=g._unit('creep',1,10780,10400,{name:'分裂目标',maxHp:10000,armor:0,magicResistance:0,damage:0,hpRegen:0,speed:0});
  window.primary=e;window.splash=c;g.entities=[p,e,c];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g._heroTick=g._creepTick=()=>{};
  Object.assign(p,{x:10400,y:10400,level:7,skillPoints:4,attackCooldown:999,hpRegen:0});g._refreshHero(p);
  Object.assign(e,{x:10540,y:10400,maxHp:10000,hp:10000,armor:0,magicResistance:0,hpRegen:0,attackCooldown:999,skillPoints:0,talentPoints:0,botLearnAt:Infinity,botShop:{nextAt:Infinity,completed:[],targets:{}}});g._index();r.center(p);
 });
 const damages=[];
 for(let rank=1;rank<=4;rank++){
  await page.locator('[data-learn="1"]').click();await page.waitForFunction(rank=>g.player.abilityLevels[1]===rank,rank);
  const result=await page.evaluate(()=>{const p=g.player;p.damage=100;p.attackCooldown=0;p.cooldowns[1]=0;primary.hp=splash.hp=10000;const ok=g._attack(p,primary);return {ok,rank:p.abilityLevels[1],primary:10000-primary.hp,splash:10000-splash.hp,cooldown:p.cooldowns[1],player:{x:p.x,y:p.y,range:p.range,autocast:p.autocast},target:{x:primary.x,y:primary.y,armor:primary.armor,range:primary.range}};});
  assert.ok(Math.abs(result.primary-(100+rank*35))<1e-7,JSON.stringify(result));assert.ok(Math.abs(result.splash-(100+rank*35)*1.5)<1e-7,JSON.stringify(result));damages.push(result.splash);
  await page.locator('#ability-1').hover();await page.waitForSelector('.skill-tooltip:not([hidden])');
  const values=await page.locator('.skill-tooltip').textContent();assert.match(values,/分裂伤害 %150/);assert.match(values,new RegExp('强化攻击伤害'+rank*35));
 }
 assert.deepEqual(damages,[202.5,255,307.5,360]);check('Actual W learning increases rank 1–4 cleave damage at fixed attack damage; tooltip retains the official 150% ratio');
 const expected=await page.evaluate(()=>{
  const p=g.player;p.inventory=['greater_crit'];p.inventoryMeta=[];g._refreshHero(p);p.attackCooldown=0;p.cooldowns[1]=0;primary.hp=splash.hp=10000;g._random=()=>0;g.effects=[];criticalDraws=[];
  const attack=(p.damage+140)*2.25;g._attack(p,primary);return {attack,primary:10000-primary.hp,splash:10000-splash.hp,zoom:r.zoom};
 });
 assert.ok(Math.abs(expected.primary-expected.attack)<1e-7);assert.ok(Math.abs(expected.splash-expected.attack*1.5)<1e-7);
 await page.waitForFunction(text=>criticalDraws.some(d=>d.text===text),`${Math.round(expected.attack)}!`);
 const draw=await page.evaluate(()=>criticalDraws[0]);assert.equal(draw.color,'#ff5951');const size=Number(draw.font.match(/([\d.]+)px/)[1]);assert.ok(Math.abs(size-18/expected.zoom)<1e-5);
 assert.equal(await page.evaluate(()=>g.effects.filter(f=>f.type==='text'&&f.critical).length),1);check('Item critical damage is rendered as a red enlarged number, and Tidebringer cleaves the full critical hit');
 await page.evaluate(()=>g.setPaused(true));await page.screenshot({path:'artifacts/tidebringer-critical-1366.png'});
 assert.deepEqual(errors,[]);await writeFile('artifacts/tidebringer-browser-report.json',JSON.stringify({checks,damages,critical:expected,draw,errors},null,2));
}finally{await browser.close();}
