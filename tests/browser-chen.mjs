import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createCoopServer} from '../server/coop-server.mjs';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
let service,base=process.env.GAME_URL;
if(!base){service=createCoopServer({root:fileURLToPath(new URL('..',import.meta.url)),port:0,autoTick:false});await service.listen();base=`http://127.0.0.1:${service.server.address().port}`;}
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
const check=name=>{checks.push(name);console.log('PASS '+name);};
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function advance(seconds){await page.evaluate(async seconds=>{const {Game}=await import('/src/engine.js');Game.prototype.step.call(g,seconds);},seconds);}
async function select(id){await page.locator(`[data-owned-unit="${id}"]`).click();await page.waitForFunction(id=>document.querySelector('.game-hud').dataset.unitId===id,id);}
async function rightClick(point){
 const position=await page.evaluate(point=>{r.lookAt(point.x,point.y-100/r.zoom);return r.worldToScreen(point.x,point.y);},point);
 await page.locator('#battlefield').click({button:'right',position});
}
try{
 await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 assert.equal(await page.locator('[data-hero]').count(),8);await page.locator('[data-hero="chen"]').click();
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(game,time){window.g=game;window.r=this;return render.call(this,game,time);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.player?.heroId==='chen'&&g.time>.1);await page.locator('#control-hint button').click();
 await page.waitForFunction(()=>document.querySelector('.hud-portrait>img').naturalWidth>0);
 for(const [index,name]of ['赎罪','神圣劝化','神力恩泽','上帝之手'].entries())assert.match(await page.locator(`#ability-${index}`).getAttribute('aria-label'),new RegExp(name));
 assert.equal(await page.locator('[data-extra="chen_zealot"]').count(),1);
 const ids=await page.evaluate(async()=>{
  const {Navigator}=await import('/src/navigation.js');const p=g.player,z=g.entities.find(e=>e.zealot&&e.ownerId===p.id);
  g.entities=[p,z];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g._neutralTick=()=>{};g._creepTick=()=>{};g.step=()=>{};
  g.navigation=new Navigator({cols:160,rows:160,cellSize:64,blocked:'0'.repeat(25600)},[]);
  Object.assign(p,{x:6000,y:6000,abilityLevels:[4,4,4,3],attackCooldown:Infinity});g._refreshHero(p);p.mana=p.maxMana;
  Object.assign(z,{x:6080,y:6000,attackCooldown:Infinity});g._index();r.zoom=.5;r.center(p);window.z=z;
  window.addEnemy=(x,y)=>{const e=g._unit('creep',1,x,y,{name:'测试敌人',lane:1,maxHp:10000,hpRegen:0,speed:0,range:0,armor:0,attackCooldown:Infinity});g.entities.push(e);return e;};
  return {player:p.id,zealot:z.id};
 });
 await select(ids.zealot);assert.equal(await page.locator('[data-unit-ability="chen_martyrdom"]').getAttribute('aria-readonly'),'false');
 assert.equal(await page.locator('[data-unit-ability="chen_martyrdom"] kbd').textContent(),'Q');
 await page.locator('[data-unit-ability="chen_martyrdom"]').hover();const tip=await page.locator('.unit-abilities .skill-tooltip').textContent();
 for(const value of ['殉道','25','20','50','500'])assert.ok(tip.includes(value),value);
 await page.locator('[data-unit-ability="chen_zealot_growth"]').hover();let growthTip=await page.locator('.unit-abilities .skill-tooltip').textContent();
 for(const value of ['成长','无上限','0.5','60%','400'])assert.ok(growthTip.includes(value),value);
 await page.evaluate(()=>{g._addXp(g.player,g.player.xpNext-g.player.xp);g._addXp(g.player,g.player.xpNext-g.player.xp);});
 await page.waitForFunction(()=>document.querySelector('#stat-armor').textContent==='4.5');
 await page.locator('#hud-unit-details').click();await page.waitForSelector('#hero-stat-tooltip:not([hidden])');
 let details=await page.locator('#hero-stat-tooltip').evaluate(el=>Object.fromEntries([...el.querySelectorAll('dl>div')].map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent])));
 assert.equal(details['攻击速度'],'125');assert.equal(details['护甲'],'4.5');assert.equal(details['魔法抗性'],'5%');
 await page.locator(`[data-inspect-hero="${ids.player}"]`).click();await page.waitForFunction(()=>document.querySelector('#hero-stat-tooltip').dataset.pinned==='true'&&g.selected.id===g.player.id);
 details=await page.locator('#hero-stat-tooltip').evaluate(el=>Object.fromEntries([...el.querySelectorAll('dl>div')].map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent])));
 const expected=await page.evaluate(()=>{const s=g.combatStats(g.player);return {as:Number(s.attackSpeed.toFixed(1)).toString(),mr:Number((s.magicResistance*100).toFixed(1))+'%'};});
 assert.equal(details['攻击速度'],expected.as);assert.equal(details['魔法抗性'],expected.mr);
 await page.mouse.move(0,0);await page.waitForTimeout(250);assert.ok(await page.locator('#hero-stat-tooltip').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('#hud-unit-details').getAttribute('aria-expanded'),'false');
 await page.locator('#hud-unit-details').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#hero-stat-tooltip').isVisible());await page.getByRole('button',{name:'关闭详细属性',exact:true}).click();
 await select(ids.zealot);check('Growth appears as a passive with its formulas and caps; real XP upgrades stack bonuses; bottom and top portrait clicks show live attributes and support keyboard/open/close behavior');
 await page.evaluate(()=>{g.player.x-=400;window.closeEnemy=addEnemy(z.x+80,z.y);});const before=await page.evaluate(()=>Math.hypot(z.x-g.player.x,z.y-g.player.y));
 await advance(.5);assert.equal(await page.evaluate(()=>z.creatureOrder),'follow');assert.ok(await page.evaluate(before=>Math.hypot(z.x-g.player.x,z.y-g.player.y)<before-100,before));assert.equal(await page.evaluate(()=>closeEnemy.hp),10000);
 check('Chen opens with his portrait, four current skills, innate recall and an independently selectable Zealot that follows him');

 await rightClick({x:7100,y:6000});await advance(8);
 assert.ok(await page.evaluate(()=>Math.hypot(z.x-g.player.x,z.y-g.player.y)>600));assert.ok(await page.evaluate(()=>Math.hypot(z.x-7100,z.y-6000)<4));
 await page.evaluate(()=>{window.park={x:z.x,y:z.y};window.parkEnemy=addEnemy(z.x+80,z.y);});await advance(2);
 assert.equal(await page.evaluate(()=>z.creatureOrder),'hold');assert.equal(await page.evaluate(()=>z.targetId),null);assert.equal(await page.evaluate(()=>parkEnemy.hp),10000);assert.ok(await page.evaluate(()=>Math.hypot(z.x-park.x,z.y-park.y)<.01));
 check('Actual empty-ground clicks move the Zealot more than 600 away and park it beside an enemy without automatic attacks');

 const target=await page.evaluate(()=>{window.farEnemy=addEnemy(z.x+1000,z.y);return {x:farEnemy.x,y:farEnemy.y,id:farEnemy.id};});await rightClick(target);await advance(.5);
 assert.equal(await page.evaluate(()=>z.targetId),target.id);assert.equal(await page.evaluate(()=>z.creatureOrder),'attack');assert.equal(await page.evaluate(()=>parkEnemy.hp),10000);
 await page.evaluate(()=>g._kill(farEnemy,z));await advance(.05);assert.equal(await page.evaluate(()=>z.targetId),await page.evaluate(()=>parkEnemy.id));assert.equal(await page.evaluate(()=>z.creatureOrder),'hunt');
 await rightClick({x:7600,y:6300});await advance(3);assert.equal(await page.evaluate(()=>z.creatureOrder),'hold');assert.equal(await page.evaluate(()=>z.targetId),null);
 const parked=await page.evaluate(()=>({x:parkEnemy.x,y:parkEnemy.y}));await rightClick(parked);await page.evaluate(()=>{g._kill(parkEnemy,z);window.nextEnemy=addEnemy(z.x+590,z.y);});await advance(.05);
 assert.equal(await page.evaluate(()=>z.targetId),await page.evaluate(()=>nextEnemy.id));
 await page.evaluate(()=>{g._kill(nextEnemy,z);g._kill(closeEnemy,null);window.returnDistance=Math.hypot(z.x-g.player.x,z.y-g.player.y);});await advance(.5);
 assert.equal(await page.evaluate(()=>z.creatureOrder),'follow');assert.ok(await page.evaluate(()=>Math.hypot(z.x-g.player.x,z.y-g.player.y)<returnDistance));
 check('Actual enemy clicks prioritize far targets, continue within 600 after a kill, allow parking to interrupt, and re-enable hunting on another enemy click');

 await page.keyboard.press('F2');await page.waitForFunction(()=>g.selectedIds.length===2);await page.keyboard.press('F4');await page.waitForFunction(id=>g.selectedIds.length===1&&g.selectedId===id,ids.zealot);
 await page.keyboard.press('F1');await page.waitForFunction(id=>g.selectedId===id,ids.player);
 await page.evaluate(()=>{window.centaur=g._makeNeutral('centaur_khan',{x:g.player.x+250,y:g.player.y},{id:'test',x:g.player.x,y:g.player.y});g._index();r.lookAt(g.player.x,g.player.y-100/r.zoom);});
 const centaurPoint=await page.evaluate(()=>r.worldToScreen(centaur.x,centaur.y));await page.mouse.move(centaurPoint.x,centaurPoint.y);await page.keyboard.press('w');await advance(.35);
 const centaurId=await page.evaluate(()=>centaur.id);await page.waitForSelector(`[data-owned-unit="${centaurId}"]`);await select(centaurId);
 assert.equal(await page.locator('[data-unit-ability="centaur_khan_war_stomp"]').getAttribute('aria-readonly'),'false');
 await page.locator('[data-unit-ability="centaur_khan_war_stomp"]').click();await advance(.6);assert.ok(await page.evaluate(()=>centaur.abilityCooldowns.centaur_khan_war_stomp>g.time));
 check('F1/F2/F4 select the hero and army; Holy Persuasion and the controlled Centaur’s skill work through real keyboard/button handlers');
 await page.evaluate(()=>g._addXp(g.player,1e8));await select(ids.zealot);await page.locator('[data-unit-ability="chen_zealot_growth"]').hover();growthTip=await page.locator('.unit-abilities .skill-tooltip').textContent();
 for(const value of ['464','上限 50','上限 60%','上限 400'])assert.ok(growthTip.includes(value),value);
 await page.locator('#hud-unit-details').click();details=await page.locator('#hero-stat-tooltip').evaluate(el=>Object.fromEntries([...el.querySelectorAll('dl>div')].map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent])));
 assert.equal(details['护甲'],'52');assert.equal(details['魔法抗性'],'60%');assert.equal(details['攻击速度'],'500');await page.getByRole('button',{name:'关闭详细属性',exact:true}).click();
 check('At level 30 Growth adds 464 damage, caps only the three requested bonuses and shows 52 armor / 60% resistance / 500 total attack speed in the portrait details');

 const visuals=await page.evaluate(()=>{
  const board=document.createElement('canvas');board.width=1320;board.height=550;const bc=board.getContext('2d');bc.fillStyle='#15221e';bc.fillRect(0,0,board.width,board.height);
  const rows=[];let index=0;
  for(const team of [0,1])for(const type of ['melee','ranged','siege'])for(const upgrade of ['normal','super','mega']){
   const canvas=document.createElement('canvas');canvas.width=220;canvas.height=220;const c=canvas.getContext('2d');
   r.drawUnit(c,{id:'gallery',kind:'creep',x:110,y:135,team,angle:-Math.PI/2,ranged:type==='ranged',siege:type==='siege',upgrade,statuses:{},radius:16},g,1);
   const data=c.getImageData(0,0,220,220).data;let opaque=0,mask=2166136261;for(let i=3;i<data.length;i+=4){if(data[i]>100)opaque++;mask=Math.imul(mask^(data[i]>100?1:0),16777619)>>>0;}
   rows.push({team,type,upgrade,opaque,mask,pixels:canvas.toDataURL()});
   const col=index%6,row=Math.floor(index/6),x=col*220,y=row*180;bc.drawImage(canvas,x,y-30);bc.font='14px sans-serif';bc.fillStyle='#e6dcc0';bc.fillText(`${team?'夜魇':'天辉'} ${type} ${upgrade}`,x+12,y+164);index++;
  }return {rows:rows.map(({pixels,...row})=>({...row,image:pixels})),image:board.toDataURL().split(',')[1]};
 });
 for(const team of [0,1])for(const type of ['melee','ranged','siege']){const variants=visuals.rows.filter(row=>row.team===team&&row.type===type);assert.equal(new Set(variants.map(row=>row.mask)).size,3);assert.equal(new Set(variants.map(row=>row.image)).size,3);assert.ok(variants.every(row=>row.opaque>1800));}
 await writeFile('artifacts/creep-three-tiers.png',Buffer.from(visuals.image,'base64'));check('Both factions’ melee, ranged and siege creeps have three visibly distinct silhouettes for normal, super and mega tiers');

 for(const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);await select(ids.zealot);await page.locator('[data-unit-ability="chen_martyrdom"]').hover();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const selector of ['.illusion-controls','.unit-abilities .skill-tooltip']){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=viewport.width+1,`${selector}: ${JSON.stringify(box)}`);}
  await page.screenshot({path:`artifacts/chen-controls-${viewport.width}.png`});
 }
 check('Chen’s army controls and creature tooltips fit desktop, laptop and mobile viewports');
 await page.setViewportSize({width:1366,height:768});await select(ids.zealot);
 const heroStart=await page.evaluate(()=>{g._kill(z,null);return {x:g.player.x,y:g.player.y};});
 await page.waitForFunction(()=>document.querySelector('.game-hud').dataset.unitId===g.player.id);
 await rightClick({x:heroStart.x+350,y:heroStart.y});await advance(.3);
 assert.ok(await page.evaluate(start=>g.player.x>start.x+20,heroStart));
 await page.keyboard.down('ArrowDown');await advance(.25);await page.keyboard.up('ArrowDown');
 assert.ok(await page.evaluate(start=>g.player.y>start.y+20,heroStart));
 check('When the selected Zealot dies, ground clicks and keyboard movement immediately control Chen again');
 const groupStart=await page.evaluate(()=>{
  g._respawn(g.player);window.liveZealot=g.entities.find(e=>e.zealot&&e.ownerId===g.player.id&&!e.dead);
  Object.assign(liveZealot,{x:6000,y:6000,attackCooldown:Infinity});g.selectEntity(liveZealot.id);g.selectedIds=[liveZealot.id,centaur.id];
  centaur.expiresAt=g.time+.1;g._index();return {x:liveZealot.x,y:liveZealot.y};
 });
 await advance(.15);assert.equal(await page.evaluate(()=>centaur.dead),true);
 await rightClick({x:groupStart.x+350,y:groupStart.y});await advance(.3);
 assert.ok(await page.evaluate(start=>liveZealot.x>start.x+20,groupStart));
 check('An expired army member leaves the remaining selected unit responsive to group movement');
 assert.deepEqual(errors,[]);await writeFile('artifacts/chen-browser-report.json',JSON.stringify({checks,ids,creeps:visuals.rows.map(({image,...row})=>row),errors},null,2)+'\n');
}catch(error){await page.screenshot({path:'artifacts/chen-browser-failure.png'});throw error;}finally{await browser.close();await service?.close();}
