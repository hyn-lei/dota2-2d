import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Game} from '../src/engine.js';
import {CoopGame} from '../server/coop-game.mjs';
import {executeCommand} from '../server/commands.mjs';
import {snapshotState} from '../server/snapshot.mjs';
import {NetworkGame} from '../src/network-game.js';
import {abilityAt,innateAt,ABILITIES,TALENTS} from '../src/ability-data.js';
import {HERO_STATS} from '../src/hero-data.js';
import {ZEALOT,CREATURE_LEVELS} from '../src/chen-data.js';
import {ownedUnits} from '../src/controlled-units.js';
import {creatureSkill} from '../src/neutral-runtime.js';
import {addStatus} from '../src/hero-runtime.js';
import {unitSkill} from '../src/unit-skills.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
import * as Chen from '../src/chen-runtime.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} should equal ${b}`);
function fixture(level=1){
 const g=new Game({hero:'chen'}),p=g.player;
 g.entities=[p,...ownedUnits(g,p)];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 g._neutralTick=()=>{};
 Object.assign(p,{x:10000,y:11000,level,abilityLevels:[4,4,0,3],attackCooldown:Infinity,hpRegen:0,manaRegen:0,maxHp:10000,hp:10000,maxMana:10000,mana:10000});
 for(const u of ownedUnits(g,p))Object.assign(u,{x:10070,y:11050,hpRegen:0,attackCooldown:Infinity});g._index();
 return {g,p};
}
function neutral(g,id,x=10200,y=11000){const u=g._makeNeutral(id,{x,y},{id:'test',x,y});u.hpRegen=0;u.manaRegen=0;u.attackCooldown=Infinity;return u;}
function foe(g,x=10400,y=11000){const u=g._unit('creep',1,x,y,{name:'靶子',lane:1,maxHp:10000,speed:0,range:0,armor:0,magicResistance:0,hpRegen:0,attackCooldown:Infinity});g.entities.push(u);return u;}
function ally(g,x=10000,y=11500){const h=g._makeHero('crystal_maiden',0,1,true,0);Object.assign(h,{x,y,isPlayer:true,controller:'human',movementInput:{x:0,y:0},hpRegen:0,manaRegen:0,attackCooldown:Infinity,maxHp:2000,hp:100});return h;}
function cast(g,index,target){assert.equal(g.cast(index,target).ok,true);g.step(.3);}
function convert(g,p,u){p.cooldowns[1]=0;cast(g,1,u);u.hpRegen=0;u.attackCooldown=Infinity;return u;}

test('Chen uses the checked Valve feed, KV stats, four current abilities and all eight talents',()=>{
 const feed=JSON.parse(fs.readFileSync('docs/research/heroes/66.json','utf8')).result.data.heroes[0];
 assert.equal(HERO_STATS.chen.dotaId,66);assert.equal(HERO_STATS.chen.range,feed.attack_range);assert.equal(HERO_STATS.chen.projectileSpeed,feed.projectile_speed);
 assert.deepEqual(ABILITIES.chen.map(s=>s.id),['chen_penitence','chen_holy_persuasion','chen_divine_favor','chen_hand_of_god']);assert.equal(TALENTS.chen.length,8);
 for(const source of JSON.parse(fs.readFileSync('docs/research/chen/sources.json','utf8')).manifest)assert.equal(createHash('sha256').update(fs.readFileSync(source.file)).digest('hex'),source.sha256);
 const q=abilityAt('chen',0,1);assert.equal(q.damage,50);assert.equal(q.damageType,'pure');assert.equal(q.mana,80);assert.equal(q.cooldown,20);
 assert.equal(abilityAt('chen',1,4,[],{level:10}).values.health_min,900);
 assert.equal(abilityAt('chen',1,4,[5],{level:20}).values.health_min,2700);
 const r=abilityAt('chen',3,3,[6,7],{hasScepter:true,hasShard:true});assert.equal(r.cooldown,70);assert.equal(r.channelTime,6);assert.equal(r.values.ancient_creeps_scepter,3);assert.equal(r.values.does_purge,1);assert.equal(r.values.full_heal_on_chen_and_creeps,1);
 assert.equal(innateAt('chen',1).values.zealot_respawn_time,59);assert.equal(innateAt('chen',30).values.zealot_respawn_time,30);
 for(let level=1;level<=30;level++)for(let index=0;index<4;index++)for(let rank=0;rank<=ABILITIES.chen[index].maxLevel;rank++){
  const s=abilityAt('chen',index,rank,[0,1,2,3,4,5,6,7],{level,hasShard:true,hasScepter:true});
  assert.ok([s.mana,s.cooldown,s.castPoint,s.channelTime,...Object.values(s.values)].every(Number.isFinite));
 }
});
test('Penitence travels before pure damage and grants attack speed only against its marked target',()=>{
 const {g,p}=fixture(),target=foe(g),other=foe(g,10500);const speed=g.combatStats(p,target).attackSpeed;
 assert.equal(g.cast(0,target).ok,true);g.step(.35);assert.equal(target.hp,10000);assert.equal(target.statuses.chenPenitence,undefined);
 g.step(.3);assert.equal(target.hp,9800);assert.equal(g.combatStats(p,target).attackSpeed,speed+80);assert.equal(g.combatStats(p,other).attackSpeed,speed);
 close(g.combatStats(target).speed,0);assert.equal(target.statuses.chenPenitence.slowPct,30);
 g.step(8);assert.equal(g.combatStats(p,target).attackSpeed,speed);
});
test('cancelled casts consume no mana and disjointed Penitence leaves no damage or mark',()=>{
 const {g,p}=fixture(),target=foe(g),mana=p.mana;
 g.cast(0,target);g.step(.1);g.moveTo(9950,11000);g.step(.5);assert.equal(p.mana,mana);assert.equal(p.cooldowns[0],0);
 p.destination=null;g.cast(0,target);g.step(.31);target.projectileDisjoint=1;g.step(.5);assert.equal(target.hp,10000);assert.equal(target.statuses.chenPenitence,undefined);
});
test('Persuasion enforces real neutral levels, restores mana, preserves snapshots and replaces the oldest of its own slots',()=>{
 const {g,p}=fixture();p.abilityLevels[1]=1;const centaur=neutral(g,'centaur_khan');assert.equal(CREATURE_LEVELS[centaur.sourceId],5);assert.equal(g.cast(1,centaur).ok,false);
 p.abilityLevels[1]=2;const a=neutral(g,'ogre_magi',10200,11100),b=neutral(g,'ghost',10300,11100),c=neutral(g,'kobold',10400,11100),stats={hp:a.maxHp,damage:a.damage,speed:a.speed};a.mana=0;
 convert(g,p,a);assert.equal(a.kind,'summon');assert.equal(a.ownerId,p.id);assert.equal(a.maxMana,a.mana);close(a.damage,stats.damage*1.1);close(a.speed,stats.speed+10);assert.equal(a.maxHp,Math.max(stats.hp,450));
 convert(g,p,b);convert(g,p,c);assert.equal(a.dead,true);assert.equal(b.dead,false);assert.equal(c.dead,false);assert.equal(ownedUnits(g,p).filter(u=>u.zealot).length,1);
 const hp=b.maxHp;p.level=20;p.abilityLevels[1]=4;p.talents=[5];assert.equal(g.skill(1).values.health_min,2700);assert.equal(b.maxHp,hp);
});
test('remote unsummoning rejects recently damaged units and then refunds twelve cooldown seconds',()=>{
 const {g,p}=fixture(),unit=convert(g,p,neutral(g,'kobold'));unit.x=14000;unit.y=11000;p.cooldowns[1]=0;
 g.damage(unit,1,foe(g,14000,11500),'pure');assert.equal(g.cast(1,unit).ok,false);
 g.step(3.01);cast(g,1,unit);assert.equal(unit.dead,true);assert.ok(p.cooldowns[1]<3.001);
});
test('Shard requires Hand of God for ancient slots, upgrades neutral skill values and retains a separate Zealot slot',()=>{
 const {g,p}=fixture(12);p.abilityLevels[3]=0;const a=neutral(g,'black_dragon');assert.equal(g.cast(1,a).ok,false);
 p.consumedShard=true;g._refreshHero(p);p.maxMana=p.mana=10000;assert.equal(g.cast(1,a).ok,false);
 p.abilityLevels[3]=1;convert(g,p,a);assert.equal(a.abilityLevelBonus,1);const b=neutral(g,'granite_golem',10200,11100);convert(g,p,b);assert.equal(a.dead,true);assert.equal(b.dead,false);
 const w=neutral(g,'centaur_khan',10300,11100);convert(g,p,w);assert.equal(creatureSkill(w,0).damage,50);assert.equal(unitSkill(g,w,'centaur_khan_war_stomp').rows.find(r=>r[0]==='伤害')[1],50);
 const roshan=g._unit('neutral',2,10300,11000,{isRoshan:true,maxHp:10000});g.entities.push(roshan);p.cooldowns[1]=0;assert.equal(g.cast(1,roshan).ok,false);
});
test('Divine Favor supplies regen and armor, amplifies healing and shares a self cast with the entire owned army',()=>{
 const {g,p}=fixture(),unit=convert(g,p,neutral(g,'kobold')),h=ally(g);p.abilityLevels[2]=4;p.hp=500;unit.hp=100;
 cast(g,2,p);assert.equal(p.statuses.chenDivineFavor.armor,20);assert.equal(unit.statuses.chenDivineFavor.armor,20);assert.equal(h.statuses.chenDivineFavor,undefined);
 const before=p.hp;g.step(.2);assert.ok(p.hp>before+1);assert.equal(h.statuses['chenAura:'+p.id].chenAuraRegen,6);
 h.x=14000;g.step(.1);assert.equal(h.statuses['chenAura:'+p.id],undefined);
});
test('Recall is global, relocates the selected owned unit and cancels on damage from an enemy hero or its controlled unit',()=>{
 const {g,p}=fixture(),unit=convert(g,p,neutral(g,'kobold'));unit.x=14000;unit.manualControl=true;
 assert.equal(g.castExtra('chen_zealot',unit).ok,true);g.step(.31);assert.ok(unit.statuses.chenRecall);g.step(6);assert.ok(Math.hypot(unit.x-p.x,unit.y-p.y)<150);
 p.extraCooldowns.chen_zealot=0;unit.x=14000;g.castExtra('chen_zealot',p);g.step(.31);
 const enemy=g._makeHero('axe',1,1,true,0),pet=g._unit('summon',1,14000,11100,{ownerId:enemy.id});g.entities.push(pet);g.damage(unit,1,pet,'pure');assert.equal(unit.statuses.chenRecall,undefined);
 p.extraCooldowns.chen_zealot=0;assert.equal(g.castExtra('chen_zealot',foe(g)).ok,false);
});
test('Hand of God heals heroes globally and only Chen’s own controlled units, including invulnerable allies',()=>{
 const {g,p}=fixture(),h=ally(g,14000,13000),unit=convert(g,p,neutral(g,'kobold')),normal=foe(g);normal.team=0;normal.hp=100;h.statuses.invulnerable={id:'invulnerable',startedAt:0,until:100,invulnerable:true};unit.hp=50;p.abilityLevels[3]=1;
 cast(g,3,p);close(h.hp,300);assert.ok(unit.hp>=250);assert.equal(normal.hp,100);
 g.step(10);close(h.hp,500);assert.equal(h.statuses.chenHandOfGod,undefined);
});
test('Scepter channels nearby immunity and triples HoT, stops on movement, and level 25 talents dispel and fully heal the army',()=>{
 const {g,p}=fixture(25),h=ally(g,10300,11000),unit=convert(g,p,neutral(g,'kobold'));p.hasScepter=true;p.abilityLevels[2]=4;p.abilityLevels[3]=1;h.hp=100;h.hpRegen=0;cast(g,3,p);g.step(.05);
 assert.equal(p.channel.kind,'chenHandOfGod');assert.equal(h.statuses['chenImmunity:'+p.id].debuffImmune,true);assert.equal(p.statuses['chenImmunity:'+p.id],undefined);close(g.combatStats(h).magicResistance,1-(1-h.magicResistance)*.4);
 const hp=h.hp;g.step(1);close(h.hp-hp,60+6);g.moveTo(9800,11000);g.step(.05);assert.equal(p.channel,null);assert.equal(h.statuses['chenImmunity:'+p.id],undefined);
 p.cooldowns[3]=0;p.hasScepter=false;p.talents=[6,7];p.hp=100;unit.hp=10;h.statuses.stun={id:'stun',startedAt:g.time,until:g.time+100,stunned:true};cast(g,3,p);
 assert.equal(p.hp,p.maxHp);assert.equal(unit.hp,unit.maxHp);assert.equal(h.statuses.stun,undefined);
});
test('Zealot appears at spawn and after each hero respawn, regenerates after its level-scaled death timer and snapshots its talents',()=>{
 const {g,p}=fixture(),z=ownedUnits(g,p).find(u=>u.zealot);assert.equal(z.maxHp,ZEALOT.maxHp);assert.equal(z.damageMin,ZEALOT.damageMin+2);
 g._kill(z,null);g.step(58.9);assert.equal(ownedUnits(g,p).some(u=>u.zealot),false);g.step(.2);assert.equal(ownedUnits(g,p).filter(u=>u.zealot).length,1);
 p.level=10;p.talents=[1];g._respawn(p);const next=ownedUnits(g,p).find(u=>u.zealot);close(next.maxHp,900);close(next.damageMin,(21+20)*1.25*1.2);assert.equal(ownedUnits(g,p).filter(u=>u.zealot).length,1);
});
test('Martyrdom consumes the Zealot after its cast point and resolves a traveling pure damage or half-strength healing projectile',()=>{
 for(const friendly of [false,true]){
  const {g,p}=fixture(),z=ownedUnits(g,p).find(u=>u.zealot),target=foe(g,10350,11050);if(friendly){target.team=0;target.hp=100;}z.hp=500;
  assert.equal(g.unitCommand(z.id,'cast',[0,target]).ok,true);g.step(.2);assert.equal(z.dead,false);g.step(.11);assert.equal(z.dead,true);const hp=target.hp;g.step(.4);
  close(target.hp-hp,friendly?62.5:-125);assert.ok(p.zealotRespawnAt>g.time);
 }
});
test('controlled neutral casts use cast points, mana, projectile timing and independent movement; opponent units remain read only',()=>{
 const {g,p}=fixture(),unit=convert(g,p,neutral(g,'centaur_khan'));const target=foe(g,unit.x+100,unit.y),mana=unit.mana;
 assert.equal(g.unitCommand(unit.id,'cast',[0,target]).ok,true);g.step(.2);assert.equal(target.hp,10000);g.step(.3);assert.equal(target.hp,9975);assert.equal(unit.mana,mana-50);assert.ok(g.isStunned(target));
 const before={x:unit.x,y:unit.y},heroX=p.x;g.unitCommand(unit.id,'setMovement',[1,0]);g.step(.1);assert.ok(unit.x>before.x);assert.equal(p.x,heroX);assert.equal(g.unitCommand(target.id,'setMovement',[1,0]).ok,false);
 assert.equal(g.unitCommand(unit.id,'useItem',[0]).ok,false);assert.equal(g.unitCommand(unit.id,'recall',[]).ok,false);
});
test('Chen survives saves with active spells and command ownership is identical in cooperative and client presentation code',async()=>{
 const {g,p}=fixture(),target=foe(g);g.cast(0,target);g.step(.31);const restored=restoreMatch(parseMatch(serializeMatch(g)));restored.paused=false;restored.step(.5);assert.equal(restored.entities.find(e=>e.id===target.id).hp,9800);assert.equal(ownedUnits(restored,restored.player).filter(e=>e.zealot).length,1);
 const game=new CoopGame([{heroId:'chen',clientId:'one',name:'陈'}],{fillWithAI:true}),owner=game.player,z=ownedUnits(game,owner).find(e=>e.zealot);
 assert.equal(executeCommand(game,owner.id,{type:'command',id:1,action:'unitCommand',args:[z.id,'setMovement',[1,0]]}).ok,true);
 const enemy=game.entities.find(e=>e.heroId==='chen'&&e.team===1),other=enemy?ownedUnits(game,enemy)[0]:game.entities.find(e=>e.kind==='hero'&&e.team===1);
 assert.equal(executeCommand(game,owner.id,{type:'command',id:2,action:'unitCommand',args:[other.id,'setMovement',[1,0]]}).ok,false);
 const calls=[],client=new NetworkGame({state:snapshotState(game),playerId:owner.id,request:(action,args)=>{calls.push({action,args});return Promise.resolve({ok:true});}});
 assert.equal((await client.unitCommand(z.id,'setMovement',[0,1])).ok,true);assert.equal(calls[0].action,'unitCommand');
});

test('controlled creature damage auras and reductions apply once to actual attacks',()=>{
 const {g,p}=fixture(),z=ownedUnits(g,p).find(u=>u.zealot);
 convert(g,p,neutral(g,'alpha_wolf',10000,11200));
 Object.assign(z,{damage:25,damageMin:25,damageMax:25});
 const target=foe(g,z.x+100,z.y);
 g._index();
 close(g.combatStats(z,target).damage,30);
 assert.equal(g._attack(z,target,{attackReleased:true}),true);
 close(10000-target.hp,30);
 addStatus(g,z,'testDamageReduction',{duration:3,creatureDamageReduction:50});
 close(g.combatStats(z,target).damage,15);
 const before=target.hp;
 assert.equal(g._attack(z,target,{attackReleased:true}),true);
 close(before-target.hp,15);
});

test('saving after an aura source dies removes its health bonus after restoration',()=>{
 const {g,p}=fixture(),z=ownedUnits(g,p).find(u=>u.zealot),baseHp=z.maxHp;
 p.consumedShard=true;g._refreshHero(p);p.maxMana=p.mana=10000;
 const golem=convert(g,p,neutral(g,'granite_golem',10000,11200));
 assert.ok(z.maxHp>baseHp);assert.ok(z.creatureHpBonus>0);
 g._kill(golem,null);
 const restored=restoreMatch(parseMatch(serializeMatch(g)));
 restored.paused=false;restored.step(.3);g.step(.3);
 const loaded=restored.entities.find(e=>e.id===z.id);
 close(z.maxHp,baseHp);close(loaded.maxHp,baseHp);
 close(loaded.creatureHpBonus,0);
 assert.equal(Object.values(loaded.statuses).some(s=>s.creatureAura),false);
});

test('a stunned Zealot cannot begin Martyrdom or sacrifice after a short stun expires',()=>{
 const {g,p}=fixture(),z=ownedUnits(g,p).find(u=>u.zealot),target=foe(g,z.x+150,z.y);
 addStatus(g,z,'stun',{duration:.1,stunned:true});
 assert.equal(g.unitCommand(z.id,'cast',[0,target]).ok,false);
 assert.ok(!z.neutralCast);
 g.step(.35);
 assert.equal(z.dead,false);close(target.hp,10000);
});

test('controlled Harpy Chain Lightning completes later bounces with the official damage decay',()=>{
 const {g,p}=fixture(),harpy=convert(g,p,neutral(g,'harpy_storm'));
 const targets=[foe(g,harpy.x+150,harpy.y),foe(g,harpy.x+250,harpy.y),foe(g,harpy.x+350,harpy.y)];
 assert.equal(g.unitCommand(harpy.id,'cast',[0,targets[0]]).ok,true);
 g.step(.31);close(10000-targets[0].hp,120);close(targets[1].hp,10000);
 g.step(.5);close(10000-targets[1].hp,90);close(10000-targets[2].hp,67.5);
 assert.equal(g.pendingSpells.some(s=>s.type==='creatureChain'),false);
});
