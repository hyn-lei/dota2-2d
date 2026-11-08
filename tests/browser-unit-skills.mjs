import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
import {NEUTRAL_UNITS,NEUTRAL_ABILITIES} from '../src/unit-data.js';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],checks=[];
const check=name=>{checks.push(name);console.log('PASS '+name);};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await mkdir('artifacts',{recursive:true});
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5193',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
 const fixtures=await page.evaluate(async()=>{
  const {LANE_CREEPS,NEUTRAL_UNITS}=await import('/src/unit-data.js');g.paused=true;g.time=450;
  const fixtures={};for(const type of ['melee','ranged','siege','flagbearer']){const u=g._unit('creep',0,8000,8000,{...LANE_CREEPS[type],name:type,range:0,speed:0});g.entities.push(u);fixtures[type]=u.id;}
  for(const id of Object.keys(NEUTRAL_UNITS)){const u=g._makeNeutral(id,{x:10000,y:10000},g.camps[0]);fixtures[id]=u.id;}
  for(const tier of [1,2,3,4])fixtures['tower'+tier]=g.entities.find(e=>e.kind==='tower'&&e.tier===tier&&e.team===0).id;
  fixtures.roshan=g.entities.find(e=>e.isRoshan).id;fixtures.courier=g.courier.id;
  const ward=g._unit('ward',0,8000,8000,{name:'治疗守卫',healPct:5,healRadius:500,expiresAt:g.time+30,range:0});g.entities.push(ward);fixtures.healingWard=ward.id;
  return fixtures;
 });
 const select=async id=>{await page.evaluate(id=>g.selectEntity(id),id);await page.waitForFunction(id=>document.querySelector('.game-hud').dataset.unitId===id,id);};
 const tip=async id=>{await page.locator(`[data-unit-ability="${id}"]`).hover();await page.waitForSelector('.unit-abilities .skill-tooltip:not([hidden])');return page.locator('.unit-abilities .skill-tooltip').textContent();};
 for(const [type,id,name] of [['melee','creep_irresolute','绵力'],['ranged','creep_piercing','穿刺'],['siege','creep_siege','坚锐']]){
  await select(fixtures[type]);assert.ok(await page.locator(`[data-unit-ability="${id}"]`).count());const content=await tip(id);assert.ok(content.includes(name));assert.ok(content.includes('被动技能'));assert.ok(/伤害/.test(content));
 }
 check('Melee/ranged/siege creeps show original 绵力 / 穿刺 / 坚锐 icons and detailed damage modifiers');
 await select(fixtures.flagbearer);let content=await tip('flagbearer_creep_aura_effect');for(const s of ['鼓舞光环','700','3','4','7.5'])assert.ok(content.includes(s),s);
 await page.waitForSelector('[data-status-id="flagbearerAura"]');assert.ok(await page.locator('[data-unit-ability="flagbearer_creep_aura_effect"] img').evaluate(i=>i.complete&&i.naturalWidth>0));
 await select(fixtures.melee);await page.waitForSelector('[data-status-id="flagbearerAura"]');await page.evaluate(id=>g.entities.find(e=>e.id===id).x+=701,fixtures.flagbearer);await page.waitForFunction(()=>!document.querySelector('[data-status-id="flagbearerAura"]'));
 await page.evaluate(id=>{const u=g.entities.find(e=>e.id===id);u.x-=701;},fixtures.flagbearer);await page.waitForSelector('[data-status-id="flagbearerAura"]');await page.evaluate(id=>{const u=g.entities.find(e=>e.id===id);u.dead=true;u.hp=0;},fixtures.flagbearer);await page.waitForFunction(()=>!document.querySelector('[data-status-id="flagbearerAura"]'));
 check('Flagbearer aura has original values/art and appears/disappears with source range/death');
 for(const tier of [1,2,3,4]){await select(fixtures['tower'+tier]);assert.equal(await page.locator('[data-unit-ability="creep_siege"]').count(),1);if(tier>1){const id=tier===2?'backdoor_protection':'backdoor_protection_in_base';await page.evaluate(()=>g.selected.backdoorActive=true);await page.waitForFunction(id=>!document.querySelector(`[data-unit-ability="${id}"]`).classList.contains('passive-disabled'),id);content=await tip(id);assert.ok(content.includes('偷塔保护'));assert.ok(content.includes('90'));await page.evaluate(()=>g.selected.backdoorActive=false);await page.waitForFunction(id=>document.querySelector(`[data-unit-ability="${id}"]`).classList.contains('passive-disabled'),id);}}
 check('All four tower tiers show their actual abilities and live backdoor protection state');
 for(const [kind,data] of Object.entries(NEUTRAL_UNITS)){
  await select(fixtures[kind]);const expected=data.abilities.filter(id=>!NEUTRAL_ABILITIES[id]?.behavior.includes('HIDDEN'));
  assert.deepEqual(await page.locator('[data-unit-ability]').evaluateAll(bs=>bs.map(b=>b.dataset.unitAbility)),expected,kind);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-unit-ability] img')].every(i=>i.complete&&i.naturalWidth>0));
 }
 await select(fixtures.centaur_khan);content=await tip('centaur_khan_war_stomp');assert.ok(content.includes('战争践踏'));assert.ok(content.includes('魔法消耗'));assert.ok(content.includes('眩晕'));
 await page.evaluate(()=>g.selected.abilityCooldowns.centaur_khan_war_stomp=g.time+9);await page.waitForFunction(()=>document.querySelector('[data-unit-ability="centaur_khan_war_stomp"] .cooldown').textContent==='9');await page.evaluate(()=>g.time+=3);await page.waitForFunction(()=>document.querySelector('[data-unit-ability="centaur_khan_war_stomp"] .cooldown').textContent==='6');
 check('Every one of 47 neutral kinds has its complete visible skill list; active mana/range/control/cooldown details update live');
 await select(fixtures.ogre_magi);content=await tip('ogre_magi_frost_armor');assert.ok(content.includes('寒冰盔甲'));assert.ok(content.includes('800'));assert.ok(content.includes('40'));
 await select(fixtures.dark_troll);content=await tip('dark_troll_warlord_ensnare');assert.ok(content.includes('诱捕'));assert.ok(content.includes('75'));await select(fixtures.dark_troll_warlord);content=await tip('dark_troll_warlord_raise_dead');assert.ok(content.includes('亡灵复生'));assert.ok(content.includes('250'));
 check('Supplemental Valve datafeed fills all three skills missing from the old unit KV snapshot');
 await select(fixtures.roshan);content=await tip('roshan_slam');assert.ok(content.includes('震击'));assert.ok(content.includes('350'));
 assert.equal(await page.locator('#mana-label').textContent(),'0 / 0');
 await select(fixtures.courier);await page.evaluate(()=>{g.selected.level=20;g.selected.burstReadyAt=g.time+15;});await page.waitForFunction(()=>document.querySelector('[data-unit-ability="courier_burst"] .cooldown').textContent==='15');content=await tip('courier_burst');assert.ok(content.includes('120'));assert.ok(content.includes('6'));
 const before=await page.evaluate(()=>JSON.stringify({command:g.selected.command,ready:g.selected.burstReadyAt,hero:g.player.abilityLevels}));await page.locator('[data-unit-ability="courier_burst"]').click();assert.equal(await page.evaluate(()=>JSON.stringify({command:g.selected.command,ready:g.selected.burstReadyAt,hero:g.player.abilityLevels})),before);
 await select(fixtures.healingWard);content=await tip('juggernaut_healing_ward');assert.ok(content.includes('500'));assert.ok(content.includes('5'));
 check('Roshan, courier and healing ward detail/cooldown displays work; inspection remains read-only');
 for(const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);await select(fixtures.roshan);await tip('roshan_slam');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const boxes=await page.locator('[data-unit-ability]').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom};}));for(let i=0;i<boxes.length;i++){assert.ok(boxes[i].x>=0&&boxes[i].right<=viewport.width+1);if(i)assert.ok(boxes[i].x>=boxes[i-1].right-1);}
  const tooltip=await page.locator('.unit-abilities .skill-tooltip').boundingBox();assert.ok(tooltip.x>=0&&tooltip.x+tooltip.width<=viewport.width+1);await page.screenshot({path:`artifacts/unit-skills-${viewport.width}.png`});
 }
 check('Desktop/laptop/mobile skill icons and tooltips fit without overlaps or horizontal overflow');
 assert.deepEqual(errors,[]);await writeFile('artifacts/unit-skills-report.json',JSON.stringify({checks,errors},null,2)+'\n');
}finally{await browser.close();}
