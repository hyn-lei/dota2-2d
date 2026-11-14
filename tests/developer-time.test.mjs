import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {CoopGame} from '../server/coop-game.mjs';
import {tickBot} from '../src/bot-ai.js';
import * as Developer from '../src/developer-mode.js';
import {addStatus} from '../src/hero-runtime.js';
import {stockStatus,createMeta} from '../src/inventory.js';
import {cutTree,plantTree} from '../src/item-common.js';
import {TREES,BASES} from '../src/map-data.js';
import {serializeMatch,parseMatch,restoreMatch,storeMatch,loadMatch,SAVE_KEY} from '../src/game-save.js';

const Clock=await import('../src/match-clock.js').catch(()=>({}));
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} should equal ${expected}`);
function setTime(game,minutes){
 assert.equal(typeof Developer.setDeveloperTime,'function','developer match-time control must exist');
 return Developer.setDeveloperTime(game,minutes);
}
function fixture(hero='chen'){
 const g=new Game({hero}),p=g.player;
 g.entities=g.entities.filter(e=>e===p||e.ownerId===p.id);
 g.time=60;g.wave=3;g.nextWave=90;g.nextNeutralSpawn=120;g.roshanRespawnAt=Infinity;
 Object.assign(p,{x:10000,y:11000,abilityLevels:hero==='chen'?[1,4,0,0]:[0,0,0,0],attackCooldown:Infinity,hpRegen:0,manaRegen:0});
 for(const unit of g.entities)if(unit!==p)Object.assign(unit,{x:10080,y:11000,attackCooldown:Infinity,hpRegen:0});
 g._creepTick=()=>{};g._neutralTick=()=>{};g._index();
 assert.equal(Developer.enableDeveloperMode(g,'821027').ok,true);
 return {g,p};
}
function target(g){
 const unit=g._unit('creep',1,10500,11000,{lane:1,maxHp:10000,armor:0,magicResistance:0,speed:0,range:0,hpRegen:0,attackCooldown:Infinity});
 g.entities.push(unit);g._index();return unit;
}
function heroTarget(g){
 const unit=g._makeHero('crystal_maiden',1,1,true,0);
 Object.assign(unit,{x:10250,y:11000,maxHp:10000,hp:10000,magicResistance:0,armor:0,baseArmor:0,hpRegen:0,manaRegen:0,attackCooldown:Infinity,abilityLevels:[0,0,0,0]});
 g._index();return unit;
}
function equip(g,hero,id){hero.inventory=[id];hero.inventoryMeta=[createMeta(hero,id)];g._refreshHero(hero);}
const storage=()=>{
 const entries=new Map();
 return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
};

test('time adjustment requires an unlocked solo match and rejects non-finite or out-of-range minutes',()=>{
 const locked=new Game(),before=locked.time;
 assert.equal(setTime(locked,200).ok,false);assert.equal(locked.time,before);
 const {g}=fixture();g.setPaused(true);
 for(const value of [NaN,Infinity,-Infinity,-1,500.0001,'200',null,true]){
  assert.equal(setTime(g,value).ok,false);assert.equal(g.time,60);
 }
 assert.equal(setTime(g,0).ok,true);assert.equal(g.time,0);assert.equal(g.paused,true);
 assert.equal(setTime(g,500).ok,true);assert.equal(g.time,30000);
 const network=new CoopGame([{clientId:'one',name:'one',heroId:'chen'}],{fillWithAI:true});
 assert.equal(setTime(network,200).ok,false);assert.equal(network.time,0);
 g.status='won';assert.equal(setTime(g,100).ok,false);assert.equal(g.time,30000);
});

test('one minute jumps directly to 200 and back while retaining units, resources and the next spawn cadence',()=>{
 const {g,p}=fixture();g.setPaused(true);
 const units=[...g.entities],poses=units.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp})),seed=g.seed,serial=g.serial,hp=p.hp,gold=p.gold;
 const spawnCounts=g.camps.map(c=>c.spawnCount);
 assert.equal(setTime(g,200).ok,true);
 assert.equal(g.time,12000);assert.equal(g.wave,401);assert.equal(g.nextWave,12030);assert.equal(g.nextNeutralSpawn,12060);
 assert.deepEqual(g.entities,units);assert.equal(g.seed,seed);assert.equal(g.serial,serial);
 assert.deepEqual(g.entities.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp})),poses);
 assert.equal(p.hp,hp);assert.equal(p.gold,gold);assert.equal(p.level,1);assert.equal(g.paused,true);
 assert.deepEqual(g.camps.map(c=>c.spawnCount),spawnCounts);assert.ok(g.camps.every(c=>c.nextSpawn===12060));
 assert.equal(setTime(g,.5).ok,true);
 assert.equal(g.time,30);assert.equal(g.wave,2);assert.equal(g.nextWave,60);assert.equal(g.nextNeutralSpawn,60);
 assert.deepEqual(g.entities,units);assert.ok(g.camps.every(c=>c.nextSpawn===60));
});

test('nightmare AI reassesses its visible focus after rewinding instead of retaining a future team plan',()=>{
 const {g,p}=fixture(),bot=g._makeHero('axe',1,1,false,0);g.difficulty='nightmare';
 Object.assign(bot,{x:10400,y:11000,attackCooldown:Infinity});p.hp=100;g._index();
 assert.equal(setTime(g,200).ok,true);tickBot(g,bot);assert.equal(bot.teamFocusTargetId,p.id);
 p.x=19000;g._index();assert.equal(setTime(g,0).ok,true);tickBot(g,bot);
 assert.equal(bot.teamFocusTargetId,null);
});

test('active cast points, traveling projectiles and damage ticks keep their remaining time across both directions',()=>{
 const {g,p}=fixture(),enemy=target(g);
 addStatus(g,enemy,'clockBurn',{duration:4,sourceId:p.id,tickInterval:1,nextTick:61,tickDamage:10,fullDamageTicks:true,damageType:'pure'});
 assert.equal(g.cast(0,enemy).ok,true);g.setPaused(true);
 assert.equal(setTime(g,200).ok,true);close(p.castPhase.executeAt,12000.3);close(enemy.statuses.clockBurn.nextTick,12001);
 g.setPaused(false);g.step(.31);assert.ok(g.pendingSpells.some(s=>s.type==='chenProjectile'));close(enemy.hp,10000);
 g.setPaused(true);const remainingBurn=enemy.statuses.clockBurn.until-g.time;
 assert.equal(setTime(g,1).ok,true);close(enemy.statuses.clockBurn.until-g.time,remainingBurn);
 g.setPaused(false);g.step(.51);close(enemy.hp,9950);g.step(.21);close(enemy.hp,9940);
 assert.equal(g.pendingSpells.some(s=>s.type==='chenProjectile'),false);
});

test('absolute item and creature timers shift once while relative cooldowns and status durations stay intact',()=>{
 const {g,p}=fixture(),z=g.entities.find(e=>e.zealot),skill=g.skill(0),skillValues=structuredClone(skill.values);
 p.inventory=['blink'];p.inventoryMeta=[createMeta(p,'blink',{purchasedAt:58,readyAt:66,cooldownRemaining:8,brokenUntil:70})];
 p.cooldowns=[7,6,5,4];p.extraCooldowns={chen_zealot:9};p.extraCooldownTick=60;p.lastHeroDamageAt=59;
 z.abilityCooldowns={example:70};p.itemBarrierCooldowns={pipe:80};p.drowWaveHits={wave:65};
 addStatus(g,p,'clockBuff',{duration:10,armor:7});
 // A shared live entity reference must not cause a second timestamp shift.
 g.effects.push({type:'beam',x:p.x,y:p.y,life:2,maxLife:2,startedAt:60,target:z});
 assert.equal(setTime(g,200).ok,true);
 close(p.inventoryMeta[0].purchasedAt,11998);close(p.inventoryMeta[0].readyAt,12006);close(p.inventoryMeta[0].brokenUntil,12010);
 close(z.abilityCooldowns.example,12010);close(p.itemBarrierCooldowns.pipe,12020);close(p.drowWaveHits.wave,12005);
 assert.deepEqual(p.cooldowns,[7,6,5,4]);assert.equal(p.extraCooldowns.chen_zealot,9);assert.equal(p.inventoryMeta[0].cooldownRemaining,8);
 close(p.statuses.clockBuff.until,12010);assert.equal(p.statuses.clockBuff.duration,10);assert.deepEqual(skill.values,skillValues);
 assert.equal(setTime(g,0).ok,true);
 close(z.abilityCooldowns.example,10);close(p.inventoryMeta[0].purchasedAt,-2);close(p.inventoryMeta[0].readyAt,6);
 close(p.extraCooldownTick,0);close(p.lastHeroDamageAt,-1);close(p.statuses.clockBuff.until,10);
 assert.equal(p.inventoryMeta[0].cooldownRemaining,8);assert.equal(g.effects.at(-1).target,z);
});

test('tree lifetimes, summon expiry, courier respawn and hero death keep their current remaining timers',()=>{
 const {g,p}=fixture(),z=g.entities.find(e=>e.zealot),courier=g.entities.find(e=>e.kind==='courier');
 cutTree(g,{...TREES[0],treeIndex:0});plantTree(g,{x:7000,y:7000});
 Object.assign(courier,{dead:true,hp:0,deathTime:60,respawnAt:110});
 Object.assign(p,{dead:true,hp:0,deathTime:60,respawnTimer:12});z.expiresAt=90;
 assert.equal(setTime(g,200).ok,true);
 close(g.cutTrees.get(0),12180);close(g.plantedTrees[0].until,12020);close(z.expiresAt,12030);
 close(courier.respawnAt,12050);close(p.deathTime,12000);assert.equal(p.respawnTimer,12);
 assert.equal(setTime(g,0).ok,true);
 close(g.cutTrees.get(0),180);close(g.plantedTrees[0].until,20);close(z.expiresAt,30);close(courier.respawnAt,50);
 assert.equal(p.respawnTimer,12);close(p.deathTime,0);
 const restored=restoreMatch(parseMatch(serializeMatch(g)));close(restored.entities.find(e=>e.id===z.id).expiresAt,30);
 assert.equal(restored.player.respawnTimer,12);
});

test('recent real hero damage still awards an assist after jumping forward',()=>{
 const {g,p}=fixture(),victim=heroTarget(g),killer=g._makeHero('axe',0,1,true,0);
 g.damage(victim,10,p,'pure');assert.equal(setTime(g,200).ok,true);
 g.damage(victim,victim.hp+1,killer,'pure');assert.equal(p.assists,1);
});

test('rewinding does not revive an expired real assist window',()=>{
 const {g,p}=fixture(),victim=heroTarget(g),killer=g._makeHero('axe',0,1,true,0);
 Object.assign(killer,{x:9000,y:11000,attackCooldown:Infinity});g.damage(victim,10,p,'pure');g.step(9);
 assert.equal(setTime(g,0).ok,true);g.damage(victim,victim.hp+1,killer,'pure');assert.equal(p.assists,0);
});

test('real Mjollnir shield procs keep their one-second interval when moving the clock in either direction',()=>{
 for(const minutes of [0,200]){
  const {g,p}=fixture(),enemy=heroTarget(g);equip(g,p,'mjollnir');g._random=()=>0;
  assert.equal(g.useItem(0,p).ok,true);g.damage(p,1,enemy,'physical');const firstHp=enemy.hp;
  assert.equal(setTime(g,minutes).ok,true);g.damage(p,1,enemy,'physical');close(enemy.hp,firstHp);
  g.step(1.01);g.damage(p,1,enemy,'physical');close(firstHp-enemy.hp,225);
 }
});

test('real Crozier speed-steal ticks retain their interval after a forward jump or rewind',()=>{
 for(const minutes of [0,200]){
  const {g,p}=fixture();heroTarget(g);equip(g,p,'crellas_crozier');assert.equal(g.useItem(0,p).ok,true);g.step(.01);
  const stacks=()=>Object.values(p.statuses).filter(s=>s.id.startsWith('crozierSpeed:')).length;
  assert.equal(stacks(),1);assert.equal(setTime(g,minutes).ok,true);g.step(.05);assert.equal(stacks(),1);
  g.step(.96);assert.equal(stacks(),2);
 }
});

test('time-gated shop supply follows the selected match time while an existing refill countdown is preserved',()=>{
 const {g,p}=fixture();Object.assign(p,BASES[0]);
 assert.equal(stockStatus(g,p,'aghanims_shard').available,0);
 assert.equal(g.buy('clarity').ok,true);assert.equal(stockStatus(g,p,'clarity').available,4);close(stockStatus(g,p,'clarity').remaining,120);
 const gold=p.gold,inventory=[...p.inventory];
 assert.equal(setTime(g,200).ok,true);
 assert.equal(stockStatus(g,p,'aghanims_shard').available,1);assert.equal(stockStatus(g,p,'clarity').available,4);close(stockStatus(g,p,'clarity').remaining,120);
 assert.equal(setTime(g,1).ok,true);
 assert.equal(stockStatus(g,p,'aghanims_shard').available,0);close(stockStatus(g,p,'aghanims_shard').remaining,930);
 close(stockStatus(g,p,'clarity').remaining,120);assert.equal(p.gold,gold);assert.deepEqual(p.inventory,inventory);
});

test('future waves use the chosen time for creep growth and do not replay missed lane or neutral spawns',()=>{
 const {g}=fixture(),initialCount=g.entities.length;
 assert.equal(setTime(g,200).ok,true);assert.equal(g.entities.length,initialCount);
 g.time=12029.99;g.step(.02);assert.equal(g.wave,402);assert.equal(g.nextWave,12060);
 const lateMelee=g.entities.find(e=>e.kind==='creep'&&!e.ranged);assert.ok(lateMelee);assert.ok(g.entities.length<initialCount+80);
 assert.ok(g.camps.every(c=>c.spawnCount===0));
 g.entities=g.entities.filter(e=>e.kind!=='creep');
 assert.equal(setTime(g,0).ok,true);g.time=29.99;g.step(.02);
 const earlyMelee=g.entities.find(e=>e.kind==='creep'&&!e.ranged);
 close(lateMelee.maxHp-earlyMelee.maxHp,312);close(lateMelee.damageMin-earlyMelee.damageMin,26);
 assert.equal(g.wave,2);assert.equal(g.nextNeutralSpawn,60);
});

test('500 minutes is allowed and expiration detection is independent of pause, victory and developer authorization',()=>{
 assert.equal(typeof Clock.hasExpiredMatchTime,'function','match-time expiry guard must exist');
 const {g}=fixture();assert.equal(setTime(g,500).ok,true);assert.equal(Clock.hasExpiredMatchTime(g),false);
 Developer.disableDeveloperMode(g);g.time=30000.01;g.paused=true;g.status='won';assert.equal(Clock.hasExpiredMatchTime(g),true);
 g.status='lost';assert.equal(Clock.hasExpiredMatchTime(g),true);g.isNetwork=true;assert.equal(Clock.hasExpiredMatchTime(g),false);
});

test('an expired stored match is removed without clearing preferences, history or draft records',()=>{
 const {g}=fixture(),s=storage();g.time=30000;
 assert.equal(storeMatch(s,g,100).ok,true);assert.equal(loadMatch(s).record.state.time,30000);
 const raw=JSON.parse(s.getItem(SAVE_KEY));raw.state.time=30000.01;s.setItem(SAVE_KEY,JSON.stringify(raw));
 s.setItem('af-preferences','{"sound":false}');s.setItem('af-history','{"matches":7}');s.setItem('af-ai-drafts-v1','saved-draft');
 const loaded=loadMatch(s);assert.equal(loaded.record,null);assert.equal(loaded.hasSave,false);assert.equal(s.getItem(SAVE_KEY),null);
 assert.equal(s.getItem('af-preferences'),'{"sound":false}');assert.equal(s.getItem('af-history'),'{"matches":7}');assert.equal(s.getItem('af-ai-drafts-v1'),'saved-draft');
 assert.throws(()=>restoreMatch(parseMatch(JSON.stringify(raw))),/500/);
});

test('expired game state cannot be checkpointed again after the match-time limit',()=>{
 const {g}=fixture();g.time=30000.01;
 assert.throws(()=>serializeMatch(g),/500/);const s=storage();assert.equal(storeMatch(s,g).ok,false);assert.equal(s.getItem(SAVE_KEY),null);
});
