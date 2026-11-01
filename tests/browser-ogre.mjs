import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=name=>{checks.push(name);console.log(`PASS ${name}`);};
try{
  await page.goto(process.env.GAME_URL||'http://localhost:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);assert.equal(await page.locator('.hero-option').count(),6);
  await page.locator('[data-hero="ogre_magi"]').click();await page.waitForFunction(()=>document.querySelector('#hero-render').complete&&document.querySelector('#hero-render').naturalWidth>0);
  assert.match(await page.locator('#selected-info').textContent(),/食人魔魔法师/);await page.screenshot({path:'artifacts/ogre-lobby.png'});
  await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};});
  await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.1);
  const opening=await page.evaluate(()=>{const g=window.g;return {hero:g.player.heroId,int:g.player.intelligence,mana:g.player.maxMana,teams:[0,1].map(t=>g.entities.filter(e=>e.kind==='hero'&&e.team===t).map(e=>e.heroId))};});
  assert.equal(opening.hero,'ogre_magi');assert.equal(opening.int,0);assert.equal(opening.mana,276);assert.ok(opening.teams.every(t=>t.length===5&&new Set(t).size===5));
  check('Six-hero roster and official art load; Ogre has zero INT, innate mana and 5v5 drafting');
  await page.locator('#ability-0').hover();
  const tooltip=await page.locator('.skill-tooltip').textContent();
  assert.match(tooltip,/火焰爆轰伤害/);assert.match(tooltip,/施法前摇/);assert.ok(!tooltip.includes('???'));
  await page.mouse.move(720,400);
  await page.locator('[data-learn="0"]').click();await page.evaluate(()=>{while(window.g.player.level<10)window.g._addXp(window.g.player,window.g.player.xpNext);});
  await page.keyboard.press('u');await page.waitForFunction(()=>!document.querySelector('[data-talent="1"]').disabled);
  assert.match(await page.locator('.talent-points').textContent(),/可用天赋点 1/);
  const points=await page.evaluate(()=>window.g.player.skillPoints);await page.locator('[data-talent="1"]').click();assert.equal(await page.evaluate(()=>window.g.player.skillPoints),points);
  assert.equal(await page.evaluate(()=>window.g.player.talentPoints),0);assert.equal(await page.evaluate(()=>window.g.player.maxMana),616);await page.locator('.talent-close').click();
  check('Talent learns with its own point and Dumb Luck mana talent changes real mana');

  await page.evaluate(()=>{
    const g=window.g,p=g.player;while(p.level<25)g._addXp(p,p.xpNext);for(let i=0;i<4;i++)while(g.learnAbility(i).ok){}
    const e=g.entities.find(u=>u.kind==='hero'&&u.team===1&&u.heroId==='crystal_maiden'),c=g._unit('creep',1,10780,10400,{maxHp:10000,hp:10000,lane:1,speed:0,attackCooldown:999,damage:0,armor:0,magicResistance:0});
    Object.assign(p,{x:10400,y:10400,destination:null,navPath:null,attackCooldown:999,mana:800,manaRegen:0,hpRegen:0});
    Object.assign(e,{x:10540,y:10400,maxHp:10000,hp:10000,hpRegen:0,damage:0,speed:0,magicResistance:0,armor:0,aiTimer:Infinity,attackCooldown:999,cooldowns:[999,999,999,999],abilityLevels:[0,0,0,0],skillPoints:0,statuses:{},buffs:{}});
    g.entities=[p,e,c];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g.effects=[];g._random=()=>0;g._index();window.enemy=e;window.r.zoom=.55;window.r.lookAt(10400,10400);window.r.followPlayer=false;
  });
  const aim=async(x,y)=>{const p=await page.evaluate(({x,y})=>window.r.worldToScreen(x,y),{x,y});await page.mouse.move(p.x,p.y);};
  const mana=await page.evaluate(()=>window.g.player.mana);await aim(10540,10400);await page.keyboard.press('q');await page.waitForFunction(()=>window.enemy.hp<10000);await page.screenshot({path:'artifacts/ogre-fireblast.png'});
  await page.waitForFunction(()=>window.enemy.hp<=9000);assert.equal(await page.evaluate(()=>window.g.player.mana),mana-115);
  check('Q produces four timed Fireblasts and pays one mana cost');
  await page.keyboard.press('w');await page.waitForFunction(()=>window.enemy.statuses.ogreIgnite&&window.g.entities[2].statuses.ogreIgnite);
  await page.screenshot({path:'artifacts/ogre-ignite.png'});check('W launches real projectiles and applies burn/slow to actual targets');
  const speed=await page.evaluate(()=>window.g.combatStats(window.g.player).attackSpeed);await page.keyboard.press('Alt+e');await page.waitForFunction(()=>window.g.player.statuses.ogreBloodlust);
  assert.equal(await page.evaluate(()=>window.g.combatStats(window.g.player).attackSpeed),speed+100);
  await page.locator('#ability-2').click({button:'right'});assert.equal(await page.evaluate(()=>window.g.player.autocast[2]),true);
  await page.screenshot({path:'artifacts/ogre-bloodlust.png'});await page.keyboard.press('r');assert.match(await page.locator('#toast').textContent(),/被动/);
  check('E self cast, real self attack speed, right-click autocast and passive R work');

  await page.evaluate(async()=>{
    const I=await import('/src/inventory.js'),g=window.g,p=g.player;p.inventory=['ultimate_scepter','aghanims_shard'];p.inventoryMeta=[];I.ensureInventory(p);I.refreshInventory(g,p);p.mana=1000;p.manaRegen=0;g._random=()=>.99;window.enemy.statuses={};window.enemy.buffs={};
  });
  await page.waitForSelector('[data-extra="ogre_magi_unrefined_fireblast"]');await page.waitForSelector('[data-extra="ogre_magi_smash"]');
  await aim(10540,10400);await page.keyboard.press('d');await page.waitForFunction(()=>window.g.player.extraCooldowns?.ogre_magi_unrefined_fireblast>0);
  assert.equal(await page.evaluate(()=>window.g.player.mana),650);await page.keyboard.press('Alt+t');await page.waitForFunction(()=>window.g.player.statuses.ogreFireShield);
  const shield=await page.evaluate(async()=>{
    const {physicalDamageMultiplier}=await import('/src/hero-stats.js'),g=window.g,p=g.player,e=window.enemy;e.statuses={};e.buffs={};e.attackCooldown=0;e.damage=100;
    const before=p.hp,expected=100*physicalDamageMultiplier(g.combatStats(p).armor)*.15;g._attack(e,p);return {damage:before-p.hp,expected,stacks:p.statuses.ogreFireShield.stacks};
  });assert.ok(Math.abs(shield.damage-shield.expected)<1e-6);assert.equal(shield.stacks,2);
  await page.screenshot({path:'artifacts/ogre-upgrades.png'});check('D uses 35% current mana; T absorbs a real attack and consumes one shield charge');
  await page.evaluate(()=>window.g.setPaused(true));
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const icons=await page.locator('.extra-ability img').evaluateAll(images=>images.map(img=>{const r=img.getBoundingClientRect(),b=img.closest('button').getBoundingClientRect();return {width:r.width,height:r.height,buttonWidth:b.width,buttonHeight:b.height};}));
    assert.equal(icons.length,2);assert.ok(icons.every(i=>i.width>0&&i.width<=i.buttonWidth&&i.height<=i.buttonHeight));
    await page.screenshot({path:`artifacts/ogre-${viewport.width}.png`});
  }check('Ogre skills, status and both extra abilities remain usable at laptop/mobile widths');
  assert.deepEqual(errors,[]);await writeFile('artifacts/ogre-browser-report.json',JSON.stringify({checks,opening,errors},null,2));
  console.log(`Ogre browser verification: ${checks.length} groups passed.`);
}finally{await browser.close();}
