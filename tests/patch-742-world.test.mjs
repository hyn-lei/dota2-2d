import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {XP_TO_NEXT,calculateHeroStats} from '../src/hero-stats.js';
import {HERO_STATS} from '../src/hero-data.js';
import {NEUTRAL_UNITS,LANE_CREEPS} from '../src/unit-data.js';
import {creatureSkill,castCreature,tickCreatureWorld} from '../src/neutral-runtime.js';
import * as Skills from '../src/hero-runtime.js';
import * as Inventory from '../src/inventory.js';
import {rebaseMatchTime} from '../src/match-clock.js';

function quiet(){const g=new Game({hero:'chen'});g.entities=g.entities.filter(e=>e.isPlayer);g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g._neutralTick=()=>{};g._creepTick=()=>{};g.player.attackCooldown=Infinity;return g;}
function creep(g,team=1,x=10200,y=11000){const u=g._unit('creep',team,x,y,{maxHp:10000,range:0,speed:0,attackCooldown:Infinity,hpRegen:0,armor:0,magicResistance:0});g.entities.push(u);return u;}
function neutral(g,id,x=10000,y=11000){return g._makeNeutral(id,{x,y},{id:'fixture',x,y});}
function runSpell(g,u,index,target,seconds=1){u.attackCooldown=Infinity;u.mana=u.maxMana;assert.equal(castCreature(g,u,index,target).ok,true);g.step(seconds);}

test('7.42 hero attributes use twenty health per strength and an eight intelligence resistance step',()=>{
 const h=HERO_STATS.crystal_maiden,s=calculateHeroStats('crystal_maiden');
 assert.equal(s.maxHp,200+h.baseStrength*20);
 assert.ok(Math.abs(s.magicResistance-(h.baseMagicResistance+h.baseIntelligence*.00125))<1e-9);
 assert.equal(XP_TO_NEXT.reduce((n,x)=>n+x,0),66600);
});
test('7.42 passive income is ninety gold and fifty experience per minute even while dead',()=>{
 const g=quiet(),h=g.player;h.dead=true;h.hp=0;h.respawnTimer=1000;const gold=h.gold,xp=h.xp;
 g.step(60);assert.ok(Math.abs(h.gold-gold-90)<1e-6);assert.ok(Math.abs(h.xp-xp-50)<1e-6);
});
test('7.42 lane waves at thirty minutes retain four melee units and always carry a flagbearer',()=>{
 const g=quiet();g.wave=61;g._spawnWave();const units=g.entities.filter(e=>e.kind==='creep'&&e.team===0&&e.lane===0);
 assert.equal(units.filter(e=>!e.ranged).length,4);assert.equal(units.filter(e=>e.flagbearer).length,1);
});
test('7.42 siege creeps spawn every two and a half minutes after thirty minutes and double at sixty',()=>{
 const g=quiet();g.wave=65;g._spawnWave();assert.equal(g.entities.filter(e=>e.kind==='creep'&&e.siege).length,6);
 g.entities=g.entities.filter(e=>e.kind!=='creep');g.wave=120;g._spawnWave();assert.equal(g.entities.filter(e=>e.kind==='creep'&&e.siege).length,12);
});
test('7.42 ranged wave gains its second ranged unit at thirty five minutes',()=>{
 const g=quiet();g.wave=70;g._spawnWave();assert.equal(g.entities.filter(e=>e.kind==='creep'&&e.team===0&&e.lane===0&&e.ranged&&!e.siege).length,2);
});
test('7.42 neutral bounty upgrades alternate minima and maxima each minute while experience grows four per cycle',()=>{
 const g=quiet();g.time=900;const u=neutral(g,'kobold');
 assert.equal(u.goldMin,NEUTRAL_UNITS.kobold.goldMin+Math.ceil(15/2));assert.equal(u.goldMax,NEUTRAL_UNITS.kobold.goldMax+Math.floor(15/2));assert.equal(u.xpBounty,NEUTRAL_UNITS.kobold.xpBounty+8);
});
test('7.42 pip health takes quarter pips from creeps and two from melee heroes when fragile',()=>{
 const g=quiet(),c=creep(g,0),ward=g._unit('ward',1,10200,11000,{maxHp:3,pipHealth:true,fragile:true,hitsRemaining:3});g.entities.push(ward);
 g._hitAttack(c,ward,{damage:999,interval:1,trueStrike:true});assert.equal(ward.hp,2.75);
 const melee=g._makeHero('axe',0,1,true,1);g._hitAttack(melee,ward,{damage:999,interval:1,trueStrike:true});assert.equal(ward.hp,.75);
});
test('7.42 newly added creeps spawn as combat units with active skills and native mana',()=>{
 const g=quiet();for(const id of ['radigull','odobenus_frostmage','odobenus_footman','eimermole','eimermole_foreman','ogre_seal','ogre_seal_pup']){const u=neutral(g,id);assert.equal(u.sourceId,'npc_dota_neutral_'+id);assert.ok(u.maxHp>0);assert.ok(u.damage>0);assert.ok(u.abilities.length);}
 assert.equal(creatureSkill(neutral(g,'radigull'),0).id,'radigull_eggstremism');
});
test('7.42 radigull eggs can be destroyed before their silence explosion',()=>{
 const g=quiet(),u=neutral(g,'radigull'),enemy=creep(g,1,10300);u.team=0;runSpell(g,u,0,enemy,.5);
 const eggs=g.entities.filter(e=>e.radigullEgg);assert.equal(eggs.length,2);assert.equal(eggs[0].hp,1);
 g.player.team=1;for(const egg of eggs)g._hitAttack(g.player,egg,{damage:100,interval:1,trueStrike:true});g.step(2.1);assert.equal(enemy.hp,10000);
});
test('7.42 radigull egg explosion deals damage and silence to enemies',()=>{
 const g=quiet(),u=neutral(g,'radigull'),enemy=creep(g,1,10300);u.team=0;runSpell(g,u,0,enemy,2.5);assert.ok(enemy.hp<10000);assert.equal(Skills.hasStatusFlag(g,enemy,'silenced'),true);
});
test('7.42 odobenus snowballs damage enemies and heal allies as they bounce',()=>{
 const g=quiet(),u=neutral(g,'odobenus_frostmage'),enemy=creep(g,1,10200),ally=creep(g,0,10250);u.team=0;ally.hp=100;runSpell(g,u,0,enemy,2);assert.ok(enemy.hp<10000);assert.ok(ally.hp>100);
});
test('7.42 miners slam pulses three times instead of resolving as a single hit',()=>{
 const g=quiet(),u=neutral(g,'eimermole_foreman'),enemy=creep(g,1,10200);u.team=0;runSpell(g,u,0,enemy,1.8);assert.equal(enemy.hp,9850);
});
test('7.42 footmen apply armor reduction and uncontrolled miners apply nonstacking heal reduction',()=>{
 const g=quiet(),u=neutral(g,'odobenus_footman'),enemy=creep(g,1,10200);u.team=0;g._hitAttack(u,enemy,{damage:1,trueStrike:true,interval:1});assert.equal(g.combatStats(enemy).armor,-2);
 neutral(g,'eimermole',10220);neutral(g,'eimermole',10250);enemy.team=0;tickCreatureWorld(g);assert.equal(Object.values(enemy.statuses).reduce((n,s)=>n+(s.healReduction||0),0),20);
});
test('7.42 seal flop lands two hits and returns control after the movement',()=>{
 const g=quiet(),u=neutral(g,'ogre_seal'),enemy=creep(g,1,10600);u.team=0;runSpell(g,u,0,enemy,2.1);assert.ok(u.x>=10790);assert.equal(enemy.hp,9500);
});
test('7.42 Roshan respawn minimum shrinks each kill and rewards every member of the killing team',()=>{
 const g=quiet();g._spawnRoshan();const r=g.entities.find(e=>e.isRoshan),h=g.player,gold=h.gold;g.time=100;g.damage(r,1e9,h,'pure');assert.ok(g.roshanRespawnAt>=520&&g.roshanRespawnAt<=700);assert.ok(h.gold>=gold+r.goldMin+125);
});
test('7.42 glyph has two six minute charges and seven seconds between activations',()=>{
 const g=quiet();assert.equal(g.useGlyph().ok,true);assert.equal(g.useGlyph().ok,false);g.step(7);assert.equal(g.useGlyph().ok,true);assert.equal(g.useGlyph().ok,false);g.step(353);assert.equal(g.useGlyph().ok,true);
});
test('7.42 crafting choices are fixed at match start and consume sequential tier madstone costs',()=>{
 const g=quiet(),h=g.player,choices=structuredClone(h.neutralArtifactOptions);h.madstone=100;
 let state=g.neutralCraftState();assert.equal(state.tier,1);assert.equal(state.artifacts.length,4);assert.equal(state.cost,6);assert.equal(g.craftNeutral(state.artifacts[0],state.enchantments[0]).ok,true);assert.equal(h.madstone,94);
 assert.equal(g.craftNeutral('keep',state.enchantments[0]).ok,false);
 g.time=3000;for(let tier=2;tier<=4;tier++){state=g.neutralCraftState();assert.equal(g.craftNeutral(state.artifacts[0],state.enchantments[0]).ok,true);}assert.equal(h.madstone,60);assert.equal(g.neutralCraftState().cost,20);assert.deepEqual(h.neutralArtifactOptions,choices);
});
test('7.42 clearing a neutral camp distributes madstone to the collector and a teammate',()=>{
 const g=quiet(),h=g.player,u=neutral(g,'kobold'),other=g._makeHero('axe',0,1,false,1);Object.assign(h,{x:u.x,y:u.y});g.damage(u,1e9,h,'pure');assert.equal(h.madstone,2);assert.equal(other.madstone,1);
});
test('7.42 first Tormentor appears at fifteen minutes with four thousand barrier and drops a greater horn',()=>{
 const g=quiet();g.time=899.95;g.step(.05);const t=g.entities.find(e=>e.isTormentor);assert.ok(t);assert.equal(t.maxHp,4000);Object.assign(g.player,{x:t.x+100,y:t.y});g.damage(t,1e9,g.player,'pure');assert.ok(g.entities.some(e=>e.kind==='droppedItem'&&e.itemId==='horn_of_battle_greater'));assert.equal(g.player.consumedShard,undefined);
});
test('7.42 greater horn adds mega creeps to all three friendly lanes',()=>{
 const g=quiet();g._summonHornWave(g.player);const wave=g.entities.filter(e=>e.hornWave);assert.equal(new Set(wave.map(e=>e.lane)).size,3);assert.ok(wave.every(e=>e.team===0&&e.upgrade==='mega'));
});
test('7.42 outposts remain capturable while the hero is silenced',()=>{
 const g=quiet();const outpost=g.worldObjectives.find(e=>e.objectiveType==='outpost');Object.assign(g.player,{x:outpost.x,y:outpost.y});Skills.addStatus(g,g.player,'silence',{duration:10,silenced:true});assert.equal(g.interactObjective(outpost.id).ok,true);g.step(6.1);assert.equal(outpost.team,g.player.team);
});
test('7.42 Chen can persuade every new creep including seals with his ancient upgrade',()=>{
 const g=quiet(),h=g.player;Object.assign(h,{x:10000,y:11000,level:18,abilityLevels:[4,4,4,3],consumedShard:true,hasShard:true,maxMana:10000,mana:10000});
 for(const id of ['radigull','odobenus_frostmage','odobenus_footman','eimermole','eimermole_foreman','ogre_seal','ogre_seal_pup']){g.entities=[h];const u=neutral(g,id,10200);h.cooldowns[1]=0;h.mana=10000;assert.equal(g._cast(h,1,u).ok,true,id);g.step(.35);assert.equal(u.ownerId,h.id,id);assert.equal(u.team,h.team);assert.equal(u.kind,'summon');}
});
test('7.42 Book of the Dead warriors inherit their melee combat stats and burn fifty mana on attack',()=>{
 const g=quiet();g._summonNeutralDemons(g.player,90);const warrior=g.entities.find(e=>e.demonicon&&e.sourceId.includes('warrior')),enemy=creep(g);enemy.maxMana=enemy.mana=200;g._hitAttack(warrior,enemy,{damage:1,trueStrike:true,interval:1});assert.equal(enemy.mana,150);assert.equal(warrior.range,100);assert.equal(warrior.attackType,'basic');
});
test('7.42 surviving neutral creeps gain four experience bounty at their next growth cycle',()=>{
 const g=quiet(),u=neutral(g,'kobold'),xp=u.xpBounty,hp=u.maxHp;g.time=449.95;g.step(.05);assert.equal(u.xpBounty,xp+4);assert.equal(u.maxHp,hp+30);
});
test('7.42 first minute spawns both flooded camps and home jungle camps without stopping the match',()=>{
 const g=quiet();g.time=59.95;g.nextNeutralSpawn=60;assert.doesNotThrow(()=>g.step(.05));
 assert.ok(g.entities.some(e=>e.unitId==='tadpole'));assert.ok(g.entities.some(e=>e.unitId==='kobold'));
 assert.equal(g.camps.length,28);assert.ok(g.camps.every(c=>c.spawnCount===1));
 assert.equal(g.nextNeutralSpawn,120);assert.equal(g.status,'playing');assert.ok(g.entities.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.hp)));
 g.entities=[g.player];g.time=119.95;assert.doesNotThrow(()=>g.step(.05));assert.ok(g.camps.every(c=>c.spawnCount===2));assert.equal(g.nextNeutralSpawn,180);
});
test('7.42 twin gates on the outer rims transport heroes between the new source locations',()=>{
 const g=quiet(),gates=g.worldObjectives.filter(e=>e.objectiveType==='gate');assert.ok(gates[0].x>7500&&gates[0].y<2000);assert.ok(gates[1].x<14000&&gates[1].y>18000);
 Object.assign(g.player,{x:gates[0].x,y:gates[0].y});assert.equal(g.interactObjective(gates[0].id).ok,true);g.step(3.1);assert.ok(Math.hypot(g.player.x-gates[1].x,g.player.y-gates[1].y)<160);
});
test('7.42 Tormentor reflection stops after one round even when its attacker has active Blade Mail',()=>{
 const g=quiet(),h=g.player;h.inventory[0]='blade_mail';h.inventoryMeta[0]=Inventory.createMeta(h,'blade_mail');g._refreshHero(h);g.time=900;g.step(.05);const t=g.entities.find(e=>e.isTormentor);Object.assign(h,{x:t.x+100,y:t.y,magicResistance:0,maxHp:10000,hp:10000});assert.equal(g.useItem(0,h).ok,true);
 const hp=t.hp;g.damage(t,100,h,'pure');assert.equal(t.hp,hp-100);assert.equal(h.hp,9985);
 Skills.addStatus(g,h,'testBkb',{duration:10,debuffImmune:true});const before=h.hp;g.damage(t,100,h,'pure');assert.equal(h.hp,before);
});
test('7.42 Weighted Dice improves only maximum attack damage and rolls creep gold twice',()=>{
 const g=quiet(),h=g.player,min=h.damageMin,max=h.damageMax;h.neutralItem='weighted_dice';h.neutralItemMeta=Inventory.createMeta(h,'weighted_dice');g._refreshHero(h);assert.equal(h.damageMin,min);assert.equal(h.damageMax,max+8);
 const u=creep(g);u.goldMin=10;u.goldMax=20;const rolls=[.1,.9];g._random=()=>rolls.shift()??0;const before=h.gold;g.damage(u,1e9,h,'pure');assert.equal(h.gold-before,19);
});
test('7.42 Dormant Curio boost stays on a kept artifact and does not transfer to unrelated later crafts',()=>{
 const g=quiet(),h=g.player;h.neutralTier=1;h.neutralItem='dormant_curio';h.madstone=100;g.time=3000;let state=g.neutralCraftState();g.craftNeutral(state.artifacts[0],state.enchantments[0]);assert.equal(h.neutralItemMeta.curioBoost,true);state=g.neutralCraftState();g.craftNeutral('keep',state.enchantments[0]);assert.equal(h.neutralItemMeta.curioBoost,true);state=g.neutralCraftState();g.craftNeutral(state.artifacts[0],state.enchantments[0]);assert.equal(h.neutralItemMeta.curioBoost,false);
});
test('7.42 Roshan drops a usable banner on his second death and daytime cheese and refresher on his third',()=>{
 const g=quiet(),h=g.player;
 for(let death=1;death<=3;death++){g._spawnRoshan();const r=g.entities.find(e=>e.isRoshan&&!e.dead);g.damage(r,1e9,h,'pure');if(death===1)assert.equal(g.entities.some(e=>e.itemId==='roshans_banner'),false);}
 const banners=g.entities.filter(e=>e.itemId==='roshans_banner');assert.equal(banners.length,2);assert.deepEqual(banners.map(e=>e.meta.level),[1,2]);
 assert.ok(g.entities.some(e=>e.itemId==='cheese'));assert.ok(g.entities.some(e=>e.itemId==='refresher_shard'));
 Object.assign(h,{x:banners[0].x,y:banners[0].y});assert.equal(g.pickupItem(banners[0].id).ok,true);const slot=h.inventory.indexOf('roshans_banner');assert.ok(slot>=0);assert.equal(g.useItem(slot,{x:h.x+100,y:h.y}).ok,true);assert.ok(g.entities.some(e=>e.wardType==='banner'));
});
test('7.42 courier fragile pips preserve two ranged hits or one melee hit and restore after respawn',()=>{
 const g=quiet(),c=g.courier,enemy=creep(g);g._hitAttack(enemy,c,{damage:100,trueStrike:true,interval:1});assert.equal(c.hp,1.75);const melee=g._makeHero('axe',1,1,false,1);g._hitAttack(melee,c,{damage:100,trueStrike:true,interval:1});assert.equal(c.dead,true);g.time=c.respawnAt-.05;g.step(.05);assert.equal(c.dead,false);assert.equal(c.hp,2);assert.equal(c.fragile,true);
});
test('7.42 glyph charges replenish in order rather than restoring both at the first six minute boundary',()=>{
 const g=quiet();g.useGlyph();g.time=7;g.useGlyph();g.time=360;assert.equal(g.useGlyph().ok,true);g.time=367;assert.equal(g.useGlyph().ok,false);g.time=720;assert.equal(g.useGlyph().ok,true);
});
test('7.42 an already spawned Tormentor continues growing its barrier and reflection over time',()=>{
 const g=quiet();g.time=900;g.step(.05);const t=g.entities.find(e=>e.isTormentor);g.time=959.95;g.step(.05);assert.equal(t.maxHp,4050);assert.equal(t.hpRegen,25);assert.equal(t.reflectPct,16.5);
});
test('7.42 fountains provide true sight out to eighteen hundred units',()=>{
 const g=new Game({hero:'chen'}),h=g.player,f=g.entities.find(e=>e.kind==='fountain'&&e.team===0),enemy=g._makeHero('axe',1,1,false,1);Skills.addStatus(g,enemy,'testInvisible',{duration:10,invisible:true});Object.assign(enemy,{x:f.x+1700,y:f.y});assert.equal(g.hasTrueSight(h,enemy),true);enemy.x=f.x+1801;assert.equal(g.hasTrueSight(h,enemy),false);
});
test('7.42 mud golem camps award madstone only after their death shards are cleared',()=>{
 const g=quiet(),h=g.player,u=neutral(g,'mud_golem');Object.assign(h,{x:u.x,y:u.y});g.damage(u,1e9,h,'pure');const shards=g.entities.filter(e=>e.unitId==='mud_golem_split');assert.equal(shards.length,2);assert.equal(h.madstone,0);g.damage(shards[0],1e9,h,'pure');assert.equal(h.madstone,0);g.damage(shards[1],1e9,h,'pure');assert.equal(h.madstone,2);
});
test('7.42 black dragon swoop survives a stop order and completes its return before attacking',()=>{
 const g=quiet(),u=neutral(g,'black_dragon'),enemy=creep(g,1,10400);u.team=0;u.ownerId=g.player.id;u.manualControl=true;runSpell(g,u,0,enemy,.4);assert.ok(u.x>10000);Skills.interruptCast(g,u,false);u.attackCooldown=0;assert.equal(g._attack(u,enemy),false);g.step(2);assert.ok(Math.hypot(u.x-10000,u.y-11000)<1);assert.equal(u.creatureMotion,null);assert.ok(enemy.hp<10000);
});
test('7.42 normal power rune periods create one rune across the two river sites',()=>{
 const g=quiet();g.time=359.95;g.step(.05);assert.equal(g.worldObjectives.filter(e=>e.objectiveType==='powerRune'&&e.rune).length,1);
});
function giveRune(g,type){g.time=Math.max(g.time,360);const sites=g.worldObjectives.filter(e=>e.objectiveType==='powerRune');for(const site of sites){site.runePeriod=Math.floor(g.time/120);site.rune=null;}sites[0].rune=type;Object.assign(g.player,{x:sites[0].x,y:sites[0].y});g.step(.3);}
test('7.42 amplification and haste runes change actual damage spell amplification and movement',()=>{
 const g=quiet(),h=g.player,damage=g.combatStats(h).damage;giveRune(g,'doubleDamage');assert.ok(g.combatStats(h).damage>damage*1.7);assert.equal(h.spellAmp,15);giveRune(g,'haste');assert.equal(g.combatStats(h).speed,550);
});
test('7.42 regeneration rune restores health and mana and enemy damage lowers its rate',()=>{
 const g=quiet(),h=g.player;h.hp=100;h.mana=0;giveRune(g,'regeneration');const hp=h.hp,mana=h.mana;g.step(1);assert.ok(h.hp-hp>h.maxHp*.05);assert.ok(h.mana-mana>h.maxMana*.05);const enemy=creep(g);g.damage(h,20,enemy,'pure');const before=h.hp;g.step(1);assert.ok(h.hp-before<h.maxHp*.03);
});
test('7.42 invisibility rune disguise blocks true sight after two seconds and attacking breaks it',()=>{
 const g=quiet(),h=g.player,enemy=creep(g);giveRune(g,'invisibility');Object.assign(enemy,{x:h.x+1200,y:h.y,trueSight:2000,visionNight:2000,flying:true});assert.equal(g.canSee(enemy,h),true);g.step(2);assert.equal(g.canSee(enemy,h),false);enemy.x=h.x+10;h.attackCooldown=0;assert.equal(g._attack(h,enemy),true);g.step(.6);assert.equal(Skills.hasStatusFlag(g,h,'invisible'),false);
});
test('7.42 arcane rune changes real spell mana and cooldown then removes those bonuses on expiry',()=>{
 const g=quiet(),h=g.player;h.abilityLevels[0]=1;giveRune(g,'arcane');assert.equal(h.cooldownReduction,25);assert.equal(h.manaCostReduction,30);const enemy=creep(g,1,h.x+100,h.y),mana=h.mana;assert.equal(g._cast(h,0,enemy).ok,true);g.step(.4);assert.ok(mana-h.mana>=55&&mana-h.mana<=56);assert.ok(h.cooldowns[0]>14&&h.cooldowns[0]<=15);g.time=411;g.step(.05);assert.equal(h.cooldownReduction,0);assert.equal(h.manaCostReduction,0);
});
test('7.42 developer time changes preserve glyph drop and interaction clocks without shifting rune periods',()=>{
 const g=quiet(),h=g.player;g.useGlyph();g.time=30;g._nextWorldObjectiveTick=30.25;g.madstoneDrops=[{id:'clockDrop',x:h.x,y:h.y,ancient:false,expiresAt:50}];h.worldInteraction={objectiveId:g.worldObjectives[0].id,endsAt:36,start:{x:h.x,y:h.y}};g.worldObjectives[0].runePeriod=3;
 rebaseMatchTime(g,1200);assert.equal(g.glyphStates[0].rechargeAt[0],1530);assert.equal(g.madstoneDrops[0].expiresAt,1220);assert.equal(h.worldInteraction.endsAt,1206);assert.equal(g._nextWorldObjectiveTick,1200.25);assert.equal(g.worldObjectives[0].runePeriod,3);assert.equal(g.tormentorRespawnAt,900);
 rebaseMatchTime(g,20);assert.equal(g.glyphStates[0].rechargeAt[0],350);assert.equal(g.madstoneDrops[0].expiresAt,40);assert.equal(h.worldInteraction.endsAt,26);assert.equal(g._nextWorldObjectiveTick,20.25);
});
test('7.42 rewinding developer time keeps nearby madstone collectable and first Tormentor locked until fifteen minutes',()=>{
 const g=quiet(),h=g.player;g.time=1000;g._nextWorldObjectiveTick=1000.25;g.madstoneDrops=[{id:'clockDrop',x:h.x,y:h.y,ancient:false,expiresAt:1020}];rebaseMatchTime(g,0);g.step(.3);assert.equal(h.madstone,2);assert.equal(g.madstoneDrops.length,0);assert.equal(g.entities.some(e=>e.isTormentor),false);assert.equal(g.tormentorRespawnAt,900);
});
test('7.42 new neutral incantations carry cast points and can be interrupted before consuming mana',()=>{
 const g=quiet(),u=neutral(g,'eimermole_foreman'),enemy=creep(g,0,10200),mana=u.mana;assert.equal(castCreature(g,u,0,enemy).ok,true);g.step(.3);Skills.interruptCast(g,u,false);g.step(1);assert.equal(u.mana,mana);assert.equal(enemy.hp,10000);
});
