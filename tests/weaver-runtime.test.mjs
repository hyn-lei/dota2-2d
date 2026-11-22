import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
import {rebaseMatchTime} from '../src/match-clock.js';
import {snapshotState} from '../server/snapshot.mjs';
import * as Weaver from '../src/weaver-runtime.js';
import * as Skills from '../src/hero-runtime.js';
import {autoLearn,initializeProgression} from '../src/progression.js';
import {physicalDamageMultiplier} from '../src/hero-stats.js';
import {createIllusions} from '../src/illusions.js';
import {NetworkGame} from '../src/network-game.js';
import {tickAttacks} from '../src/attack-projectiles.js';

const setup=(ranks=[1,1,1,1])=>{const a=arena('weaver',ranks);Weaver.initializeHistory(a.g,a.p);Weaver.initializeHistory(a.g,a.e);return a;};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-5,`${actual} != ${expected}`);

test('Time Lapse records every real hero from the start with bounded history and excludes history from public snapshots',()=>{
 const {g,p,e}=arena('kunkka',[0,0,0,0]);
 assert.ok(Array.isArray(p.weaverTimeLapseHistory));
 assert.ok(Array.isArray(e.weaverTimeLapseHistory));
 assert.equal(p.weaverTimeLapseHistory[0].time,0);
 g.step(7);
 assert.ok(p.weaverTimeLapseHistory.length<=64);
 assert.ok(p.weaverTimeLapseHistory.length>=50);
 const publicHero=snapshotState(g).entities.find(h=>h.id===p.id);
 assert.equal(publicHero.weaverTimeLapseHistory,undefined);
 assert.ok(publicHero.weaverTimeLapsePreview);
 const saved=restoreMatch(parseMatch(serializeMatch(g)));
 assert.deepEqual(saved.player.weaverTimeLapseHistory,p.weaverTimeLapseHistory);
 const old=saved.player.weaverTimeLapseHistory.map(s=>s.time);
 rebaseMatchTime(saved,30);
 saved.player.weaverTimeLapseHistory.forEach((s,i)=>assert.ok(Math.abs(s.time-old[i]-23)<1e-6));
});

test('Weaver starts Geminate autocast enabled and AI learns Shukuchi without stalling',()=>{
 const {p}=setup([0,0,0,0]);initializeProgression(p);assert.equal(p.autocast[2],true);
 autoLearn(p);assert.equal(p.abilityLevels[1],1);assert.equal(p.skillPoints,0);
});

test('Swarm launches twelve moving beetles and one attaches per target to deal physical damage and reduce armor each attack',()=>{
 const {g,p,e,c}=setup();e.x=p.x+550;c.y+=900;
 assert.equal(g.cast(0,{x:p.x+3000,y:p.y}).ok,true);g.step(.3);
 const bugs=g.entities.filter(e=>e.kind==='weaverBeetle');assert.equal(bugs.length,12);
 assert.ok(bugs.every(b=>b.speed===750&&b.hp===3));
 g.step(.6);const attached=bugs.filter(b=>b.swarmTargetId===e.id);assert.equal(attached.length,1);
 const status=e.statuses['weaverSwarm:'+p.id];assert.ok(status);assert.equal(status.stacks,1);assert.equal(status.armor,-1);
 close(e.hp,4000-18*physicalDamageMultiplier(-1));const first=e.hp;g.step(1.2);
 assert.equal(status.stacks,2);close(first-e.hp,18*physicalDamageMultiplier(-2));
 const bug=attached[0],oldX=bug.x;e.x+=200;g.step(.05);assert.notEqual(bug.x,oldX);
});

test('Swarm beetles reject spells, take hero full pips and illusion quarter pips, and remove armor and vision when destroyed',()=>{
 const {g,p,e,c}=setup();c.y+=900;g.cast(0,{x:p.x+3000,y:p.y});g.step(.5);
 const bug=g.entities.find(b=>b.swarmTargetId===e.id);assert.ok(bug);
 assert.equal(g.damage(bug,10000,e,'magical'),0);assert.equal(bug.hp,3);
 const illusion=g._unit('illusion',1,e.x,e.y,{hp:100,maxHp:100});
 g.damage(bug,10000,illusion,'physical',{attack:true});assert.equal(bug.hp,2.75);
 g.damage(bug,10000,e,'physical',{attack:true});assert.equal(bug.hp,1.75);
 g.damage(bug,10000,e,'physical',{attack:true});g.damage(bug,10000,e,'physical',{attack:true});
 assert.equal(bug.dead,true);assert.equal(e.statuses['weaverSwarm:'+p.id],undefined);
});

test('Swarm expires after sixteen attached seconds and target death cancels attachment without orphaned armor or entities',()=>{
 const {g,p,e,c}=setup();c.y+=900;g.cast(0,{x:p.x+3000,y:p.y});g.step(.5);
 const bug=g.entities.find(b=>b.swarmTargetId===e.id);assert.ok(bug);const expiry=bug.expiresAt;
 g.step(expiry-g.time+.1);assert.equal(bug.dead,true);assert.equal(e.statuses['weaverSwarm:'+p.id],undefined);
 p.cooldowns[0]=0;g.cast(0,{x:p.x+3000,y:p.y});g.step(.5);const second=g.entities.find(b=>!b.dead&&b.swarmTargetId===e.id);assert.ok(second);
 g._kill(e,p);g.step(1.2);assert.equal(g.entities.some(b=>b.id===second.id),false);
});

test('Shukuchi phases immediately and fades over a quarter second before haste, and attacking ends its invisibility movement and damage',()=>{
 const {g,p,e,c}=setup();c.y+=900;assert.equal(g.cast(1).ok,true);
 assert.equal(g.combatStats(p).speed,275);assert.equal(Skills.hasStatusFlag(g,p,'invisible'),false);assert.equal(Skills.hasStatusFlag(g,p,'phased'),true);
 g.step(.2);close(e.hp,3900);assert.equal(Skills.hasStatusFlag(g,p,'invisible'),false);
 g.step(.05);assert.equal(Skills.hasStatusFlag(g,p,'invisible'),true);assert.equal(Skills.hasStatusFlag(g,p,'phased'),true);
 p.abilityLevels[2]=0;p.attackCooldown=0;g._attack(p,e);g.step(.7);p.attackCooldown=999;
 assert.equal(Skills.hasStatusFlag(g,p,'invisible'),false);assert.equal(g.combatStats(p).speed,275);
 assert.equal(Skills.hasStatusFlag(g,p,'phased'),false);const hp=e.hp;g.step(2);
 close(e.hp,hp);assert.equal(p.weaverShukuchi,null);
});

test('Shukuchi skips debuff immune targets and its shard marks trigger secondary Geminate attacks after the movement duration ends',()=>{
 const {g,p,e,c}=setup();p.hasShard=true;c.y+=900;e.statuses.immune={id:'immune',startedAt:0,until:1,debuffImmune:true};
 g.cast(1);g.step(.5);assert.equal(e.hp,4000);delete e.statuses.immune;g.step(.05);close(e.hp,3900);
 const mark=e.statuses['weaverShukuchiMark:'+p.id];assert.ok(mark);assert.ok(mark.until>4.6);
 g.step(3.45);assert.equal(g.pendingSpells.some(s=>s.result?.weaverGeminate),false);
 g.step(.2);const shot=g.pendingSpells.find(s=>s.result?.weaverGeminate);assert.ok(shot);assert.equal(shot.result.itemPotency,115);
 g.step(.2);assert.ok(e.hp<3900);assert.equal(e.statuses['weaverShukuchiMark:'+p.id],undefined);
});

test('Geminate creates a delayed full projectile attack beyond attack range without recursion or spending normal attack cooldown',()=>{
 const {g,p,e,c}=setup();c.y+=900;p.autocast={2:true};p.attackCooldown=0;g._attack(p,e);g.step(.5);p.attackCooldown=999;
 assert.ok(p.cooldowns[2]>8);const original=g.pendingSpells.find(s=>s.type==='attack');assert.ok(original);assert.equal(original.result.weaverGeminate,undefined);
 e.x=p.x+3000;g.step(.25);const secondary=g.pendingSpells.find(s=>s.result?.weaverGeminate);assert.ok(secondary);
 assert.equal(secondary.result.itemPotency,115);close(secondary.result.damage,original.result.damage+20);close(p.attackCooldown,998.75);
 assert.equal(p.weaverGeminateQueue.length,0);g.step(3.6);assert.equal(g.pendingSpells.length,0);assert.ok(e.hp<4000);
});

test('Geminate can be manually ordered while autocast is off and the level 25 talent dispatches two additional attacks',()=>{
 const {g,p,e,c}=setup();c.y+=900;p.autocast={2:false};p.talents=[7];p.attackCooldown=0;
 assert.equal(g.cast(2,e).ok,true);g.step(.5);p.attackCooldown=999;g.step(.7);
 assert.ok(Array.isArray(p.weaverGeminateQueue));assert.equal(p.weaverGeminateQueue.length,0);assert.equal(p.cooldowns[2]>0,true);
 assert.ok(e.hp<4000-3*p.damage);
});

test('Geminate shard only propagates to attached targets within twelve hundred of the original target',()=>{
 const {g,p,e,c}=setup();p.hasShard=true;c.x=e.x+1100;c.y=e.y;
 const far=g._unit('creep',1,e.x+1300,e.y,{lane:1,pathIndex:1,hp:4000,maxHp:4000,speed:0,attackCooldown:999});g.entities.push(far);
 g.cast(0,{x:p.x+3000,y:p.y});g.step(2.5);
 assert.ok(c.statuses['weaverSwarm:'+p.id]);assert.ok(far.statuses['weaverSwarm:'+p.id]);
 p.autocast={2:true};p.attackCooldown=0;g._attack(p,e);g.step(.8);p.attackCooldown=999;
 assert.ok(g.pendingSpells.some(s=>s.result?.weaverGeminate&&s.targetId===c.id));
 assert.equal(g.pendingSpells.some(s=>s.targetId===far.id),false);
});

test('Scepter ally Time Lapse preserves an allied hero movement order and attack cooldown',()=>{
 const {g,p,e,c}=setup();c.y+=900;e.y+=900;p.hasScepter=true;const ally=g._makeHero('juggernaut',0,1,false,1);
 Object.assign(ally,{x:p.x+200,y:p.y,speed:0,aiTimer:Infinity,attackCooldown:999,hpRegen:0,manaRegen:0});Weaver.initializeHistory(g,ally);
 g.step(5);const destination={x:ally.x+300,y:ally.y};ally.destination=destination;ally.hp=50;ally.attackCooldown=7;
 assert.equal(g.castExtra('weaver_time_lapse_ally',ally).ok,true);g.step(.3);
 assert.deepEqual(ally.destination,destination);close(ally.attackCooldown,6.7);
});

test('Swarm traveling beetles cannot be attacked or disabled and attached beetles get priority over other units',()=>{
 const {g,p,e,c}=setup();e.x+=600;c.y+=900;g.cast(0,{x:p.x+3000,y:p.y});g.step(.3);
 const flying=g.entities.find(b=>b.kind==='weaverBeetle'&&!b.swarmTargetId);assert.ok(flying);
 assert.equal(g.damage(flying,999,e,'physical',{attack:true}),0);Skills.applyStun(g,flying,2,e);assert.equal(Skills.isStunned(g,flying),false);
 g.step(1);const attached=g.entities.find(b=>b.swarmTargetId===e.id);assert.ok(attached);
 assert.equal(g._chooseTarget(e,1000).id,attached.id);
});

test('Weaver strong illusions retain active skill use with their own rewind history while weak illusions cannot proc Geminate',()=>{
 const {g,p,e,c}=setup();c.y+=900;g.step(.2);
 const weak=createIllusions(g,p,1,10,100,100,{type:'weak'})[0],strong=createIllusions(g,p,1,10,100,100,{type:'strong',itemPotency:40})[0];
 weak.x=p.x;weak.y=p.y+300;strong.x=p.x;strong.y=p.y-300;weak.attackCooldown=0;g._attack(weak,e);g.step(.5);weak.attackCooldown=999;strong.attackCooldown=999;
 assert.equal(weak.weaverGeminateQueue?.length||0,0);
 assert.ok(Array.isArray(strong.weaverTimeLapseHistory));assert.ok(strong.weaverTimeLapseHistory.every(s=>s.time>=.2));
 assert.equal(g.unitCommand(strong.id,'cast',[1]).ok,true);assert.ok(strong.weaverShukuchi);
 strong.cooldowns[3]=0;strong.hp=1;assert.equal(g.unitCommand(strong.id,'cast',[3]).ok,true);g.step(.3);assert.ok(strong.hp>1);
});

test('Swarm attachment and pending Geminate resume from save without double hits and retain relative clocks when match time changes',()=>{
 const {g,p,e,c}=setup();c.y+=900;g.cast(0,{x:p.x+3000,y:p.y});g.step(.6);p.attackCooldown=0;g._attack(p,e);g.step(.5);p.attackCooldown=999;
 const saved=restoreMatch(parseMatch(serializeMatch(g))),enemy=saved.entities.find(u=>u.id===e.id);saved.setPaused(false);
 const hp=e.hp;saved.step(.4);g.step(.4);close(enemy.hp,e.hp);assert.ok(enemy.hp<hp);
 const clocks=saved.entities.filter(b=>b.kind==='weaverBeetle'&&!b.dead).map(b=>({id:b.id,expiry:b.expiresAt-saved.time,next:b.nextAttackAt-saved.time}));
 rebaseMatchTime(saved,120);for(const clock of clocks){const bug=saved.entities.find(b=>b.id===clock.id);close(bug.expiresAt-saved.time,clock.expiry);if(Number.isFinite(clock.next))close(bug.nextAttackAt-saved.time,clock.next);}
});

test('Network clients retain only server rewind previews and never generate authoritative history',()=>{
 const {g,p}=setup();g.step(1);const state=snapshotState(g),client=new NetworkGame({state,playerId:p.id,request:()=>Promise.resolve({ok:true}),clock:()=>0});
 assert.equal(client.player.weaverTimeLapseHistory,undefined);assert.deepEqual(client.player.weaverTimeLapsePreview,p.weaverTimeLapsePreview);
 Weaver.recordHistories(client);client.step(5);assert.equal(client.player.weaverTimeLapseHistory,undefined);close(client.time,g.time);
});

test('Threads of Fate requires continuous proximity, pulses each six seconds, grants percentage damage and breaks at level-scaled distance',()=>{
 const {g,p,e,c}=setup();c.y+=900;const base=g.combatStats(p).damage;
 g.damage(e,10,p,'magical',{weaverShukuchi:true});g.step(1.2);close(g.combatStats(p).damage,base);g.step(.05);
 assert.ok(p.weaverThreads?.length);assert.equal(p.weaverThreads[0].phase,'established');assert.equal(e.statuses['weaverThreadSlow:'+p.id].slowPct,100);close(g.combatStats(p).damage,base*1.1);
 g.step(.45);assert.equal(e.statuses['weaverThreadSlow:'+p.id],undefined);g.step(5.55);assert.ok(e.statuses['weaverThreadSlow:'+p.id]);
 e.x=p.x+901;g.step(.05);assert.equal(p.weaverThreads.length,0);close(g.combatStats(p).damage,base);
});

test('Threads of Fate excludes reflected item damage and illusions, loses setup out of range and leaves a five second damage bonus after enemy death',()=>{
 const {g,p,e,c}=setup();c.y+=900;const base=g.combatStats(p).damage;
 g.damage(e,10,p,'magical',{itemProc:true});g.damage(e,10,p,'pure',{reflected:true});g.step(1.3);assert.equal(p.weaverThreads?.length||0,0);
 g.damage(e,10,p,'physical',{attack:true});g.step(.6);e.x=p.x+710;g.step(.05);e.x=p.x+140;g.step(.7);assert.ok(Array.isArray(p.weaverThreads));assert.equal(p.weaverThreads.length,0);
 g.damage(e,10,p,'physical',{attack:true});g.step(1.25);p.talents=[1];close(g.combatStats(p).damage,base*1.15);
 g._kill(e,p);g.step(.1);assert.equal(p.weaverThreads[0].phase,'linger');close(g.combatStats(p).damage,base*1.15);
 g.step(5);close(g.combatStats(p).damage,base);
});

test('Break stops Threads of Fate setup and established bonuses, and dispelling the enemy thread breaks its damage bonus',()=>{
 const {g,p,e,c}=setup();c.y+=900;const base=g.combatStats(p).damage;
 g.damage(e,10,p,'physical',{attack:true});g.step(1.25);Skills.applyDispel(g,e);assert.equal(e.statuses['weaverThreadSlow:'+p.id],undefined);close(g.combatStats(p).damage,base);
 g.damage(e,10,p,'physical',{attack:true});g.step(1.25);
 Skills.addStatus(g,p,'break',{duration:2,break:true});g.step(.05);assert.ok(Array.isArray(p.weaverThreads));assert.equal(p.weaverThreads.length,0);close(g.combatStats(p).damage,base);
 g.damage(e,10,p,'physical',{attack:true});g.step(1.3);assert.equal(p.weaverThreads.length,0);
});

test('Geminate extra attacks ignore later disarm and Shukuchi shard triggers a secondary attack a fifth second after early reveal',()=>{
 const {g,p,e,c}=setup();c.y+=900;p.hasShard=true;g.cast(1);g.step(.3);
 assert.ok(e.statuses['weaverShukuchiMark:'+p.id]);p.attackCooldown=0;g._attack(p,e);g.step(.45);p.attackCooldown=999;
 assert.equal(p.weaverShukuchi,null);Skills.addStatus(g,p,'disarm',{disarmed:true,duration:2});
 g.step(.2);assert.ok(g.pendingSpells.some(s=>s.result?.weaverGeminate));g.step(.2);assert.ok(e.hp<3900-p.damage);
});

test('Threads of Fate amplifies main damage rather than item bonus damage and scales break distance with hero levels',()=>{
 const {g,p,e,c}=setup();c.y+=900;p.inventory=['rapier'];g._refreshHero(p);const base=g.combatStats(p).damage;
 g.damage(e,10,p,'physical',{attack:true});g.step(1.25);close(g.combatStats(p).damage-base,5.7);
 p.level=10;e.x=p.x+950;g.step(.05);assert.equal(p.weaverThreads.length,1);e.x=p.x+1000;g.step(.05);assert.equal(p.weaverThreads.length,0);
});

test('Time Lapse restores five second old position HP mana and strongly dispels while preserving cooldowns gold and experience',()=>{
 const {g,p,e,c}=setup();e.y+=900;c.y+=900;const old={x:p.x,y:p.y,hp:p.hp,mana:p.mana};g.step(5);
 p.x+=1000;p.hp=100;p.mana=500;p.cooldowns=[4,3,2,0];const gold=p.gold,xp=p.xp;
 Skills.addStatus(g,p,'root',{rooted:true,duration:5});Skills.addStatus(g,p,'negative',{duration:5,strongDispelOnly:true});
 assert.equal(g.cast(3).ok,true);g.step(.3);
 close(p.x,old.x);close(p.y,old.y);close(p.hp,old.hp);close(p.mana,old.mana);
 assert.equal(p.statuses.root,undefined);assert.equal(p.statuses.negative,undefined);close(p.cooldowns[0],3.7);assert.ok(p.cooldowns[3]>69);
 close(p.gold,gold+90/60*.3);close(p.xp,xp+50/60*.3);assert.equal(p.projectileDisjoint,1);
});

test('Scepter ally Time Lapse uses the ultimate rank cost cooldown and rejects enemies and shares cooldown in both directions',()=>{
 const {g,p,e,c}=setup([1,1,1,2]);c.y+=900;p.hasScepter=true;const ally=g._makeHero('juggernaut',0,1,false,1);
 Object.assign(ally,{x:p.x+200,y:p.y,hpRegen:0,manaRegen:0,speed:0,aiTimer:Infinity,attackCooldown:999});Weaver.initializeHistory(g,ally);g.step(5);
 const health=ally.hp;ally.hp=50;p.mana=500;
 assert.equal(g.castExtra('weaver_time_lapse_ally',e).ok,false);assert.equal(g.castExtra('weaver_time_lapse_ally',ally).ok,true);g.step(.3);
 close(ally.hp,health);close(p.mana,425);assert.ok(p.cooldowns[3]>44);assert.ok(p.extraCooldowns.weaver_time_lapse_ally>44);
 assert.equal(g.cast(3).ok,false);p.cooldowns[3]=0;p.extraCooldowns.weaver_time_lapse_ally=0;
 assert.equal(g.cast(3).ok,true);g.step(.3);assert.equal(g.castExtra('weaver_time_lapse_ally',p).ok,false);
});

test('Time Lapse disjoints incoming attacks and can rewind to living history from before death after respawn',()=>{
 const {g,p,e,c}=setup();c.y+=900;e.range=700;e.attackCooldown=0;g._attack(e,p);e.attackCooldown=999;
 assert.ok(g.pendingSpells.some(s=>s.targetId===p.id));p.abilityLevels[3]=3;const hp=p.hp;g.cast(3);g.step(.3);g.step(.3);close(p.hp,hp);
 const living={x:p.x,y:p.y,hp:p.hp};g._kill(p,e);g.step(.2);g._respawn(p);
 p.hp=10;p.cooldowns[3]=0;g.cast(3);g.step(.3);close(p.hp,living.hp);close(p.x,living.x);close(p.y,living.y);
});

test('Time Lapse keeps a living anchor across a death longer than its history window and Scepter can restore allied illusions',()=>{
 const {g,p,e,c}=setup();c.y+=900;e.y+=900;p.abilityLevels[3]=3;const before={x:p.x,y:p.y,hp:p.hp};
 g._kill(p,e);p.respawnTimer=99;g.step(7);assert.ok(p.weaverTimeLapseHistory.length<=64);g._respawn(p);p.cooldowns[3]=0;p.hp=1;
 assert.equal(g.cast(3).ok,true);g.step(.3);close(p.x,before.x);close(p.y,before.y);close(p.hp,before.hp);
 p.hasScepter=true;p.cooldowns[3]=0;p.extraCooldowns.weaver_time_lapse_ally=0;
 const illusion=createIllusions(g,p,1,15,100,100,{type:'weak'})[0];illusion.attackCooldown=999;const hp=illusion.hp;illusion.hp=1;
 assert.equal(g.castExtra('weaver_time_lapse_ally',illusion).ok,true);g.step(.3);close(illusion.hp,hp);
});

test('Active item damage including Dagon and Shiva cannot establish Threads of Fate',()=>{
 const {g,p,e,c}=setup();c.y+=900;p.inventory=['dagon','shivas_guard'];g._refreshHero(p);p.mana=2000;
 assert.equal(g.useItem(0,e).ok,true);g.step(.1);assert.ok(e.hp<4000);assert.equal(p.weaverThreads?.length||0,0);
 assert.equal(g.useItem(1).ok,true);g.step(1.5);assert.equal(p.weaverThreads?.length||0,0);
});

test('Swarm exposes and physically damages debuff immune targets while armor reduction pauses and invisible targets shed beetles without true sight',()=>{
 const {g,p,e,c}=setup();c.y+=900;e.statuses.immune={id:'immune',startedAt:0,until:99,debuffImmune:true};
 g.cast(0,{x:p.x+3000,y:p.y});g.step(.6);const bug=g.entities.find(b=>b.swarmTargetId===e.id);assert.ok(bug);
 assert.equal(e.statuses['weaverSwarm:'+p.id].armor,0);assert.ok(e.hp<4000);
 delete e.statuses.immune;g.step(1.2);assert.equal(e.statuses['weaverSwarm:'+p.id].armor,-1);
 Skills.addStatus(g,e,'invisible',{invisible:true,positive:true,duration:2});g.step(.05);
 assert.equal(bug.dead,true);assert.equal(e.statuses['weaverSwarm:'+p.id],undefined);assert.equal(g.canSee(p,e),false);
});

test('Destroying an attached Swarm beetle grants its official bounty but expiring it grants nothing',()=>{
 const {g,p,e,c}=setup();c.y+=900;g.cast(0,{x:p.x+3000,y:p.y});g.step(.6);const bug=g.entities.find(b=>b.swarmTargetId===e.id);assert.ok(bug);
 const gold=e.gold,xp=e.xp;for(let i=0;i<3;i++)g.damage(bug,100,e,'physical',{attack:true});
 assert.ok(e.gold-gold>=32&&e.gold-gold<=34);close(e.xp-xp,20);
 const flying=g.entities.find(b=>b.kind==='weaverBeetle'&&!b.dead);const before=p.gold;Weaver.onWeaverDeath(g,flying);close(p.gold,before);
});

test('Corrupt or unbounded rewind history is rejected when restoring a saved match',()=>{
 const {g,p}=setup();const record=parseMatch(serializeMatch(g));const hero=record.state.entities.find(h=>h.id===p.id);
 hero.weaverTimeLapseHistory=Array.from({length:100},()=>({time:0,x:0,y:0,hp:1,mana:1}));assert.throws(()=>restoreMatch(record));
 hero.weaverTimeLapseHistory=[{time:0,x:NaN,y:0,hp:1,mana:1}];assert.throws(()=>restoreMatch(record));
});

test('Casting an item ends fully faded Shukuchi and schedules its shard attacks, while attacks during fading preserve invisibility',()=>{
 const {g,p,e,c}=setup();c.y+=900;p.inventory=['dagon'];g._refreshHero(p);p.hasShard=true;p.mana=2000;g.cast(1);g.step(.3);
 assert.equal(g.useItem(0,e).ok,true);assert.equal(p.weaverShukuchi,null);assert.equal(Skills.hasStatusFlag(g,p,'invisible'),false);assert.ok(p.weaverGeminateQueue.some(q=>q.shukuchi));
 p.cooldowns[1]=0;p.attackSpeed=700;p.abilityLevels[2]=0;g.cast(1);p.attackCooldown=0;g._attack(p,e);g.step(.1);p.attackCooldown=999;
 assert.ok(p.weaverShukuchi);g.step(.2);assert.equal(Skills.hasStatusFlag(g,p,'invisible'),true);assert.equal(g.combatStats(p).speed,550);
});

test('Weaver illusion attacks inherit Threads of Fate but cannot establish threads while broken',()=>{
 const {g,p,e,c}=setup();c.y+=900;const weak=createIllusions(g,p,1,10,100,100,{type:'weak'})[0];weak.x=p.x;weak.y=p.y;
 g.damage(e,10,weak,'physical',{attack:true});g.step(1.25);assert.equal(weak.weaverThreads[0].phase,'established');
 Skills.addStatus(g,weak,'break',{break:true,duration:2});g.step(.05);assert.equal(weak.weaverThreads.length,0);g.damage(e,10,weak,'physical',{attack:true});assert.equal(weak.weaverThreads.length,0);
});

test('Shukuchi immediately disjoints incoming Ignite before fading unless enemy true sight reveals Weaver',()=>{
 for(const trueSight of [false,true]){
  const {g,p,e,c}=setup();c.y+=900;e.heroId='ogre_magi';e.abilityLevels=[0,1,0,0];e.cooldowns=[999,0,999,999];e.mana=2000;e.x=p.x+500;if(trueSight)e.trueSight=900;
  assert.equal(Skills.castAbility(g,e,1,p).ok,true);g.step(.5);assert.ok(g.pendingSpells.some(s=>s.type==='ogre:ignite'));
  const hp=p.hp;g.cast(1);assert.equal(p.projectileDisjoint||0,trueSight?0:1);g.step(.6);
  if(trueSight)assert.ok(p.statuses.ogreIgnite);else{assert.equal(p.statuses.ogreIgnite,undefined);close(p.hp,hp);}
 }
});

test('Geminate secondary impact applies real item attack procs with its increased potency',()=>{
 const {g,p,e,c}=setup();c.y+=900;p.inventory=['diffusal_blade'];g._refreshHero(p);e.mana=1000;e.maxMana=1000;e.manaRegen=0;
 p.attackCooldown=0;g._attack(p,e);g.step(.5);p.attackCooldown=999;g.step(.5);
 close(e.mana,1000-40-46);assert.ok(e.hp<4000-2*p.damage);assert.equal(g.pendingSpells.length,0);
});

test('Items marked IGNORE_INVISIBLE preserve Shukuchi while their real toggle still executes',()=>{
 const {g,p,e,c}=setup();e.y+=900;c.y+=900;p.inventory=['armlet'];g._refreshHero(p);g.cast(1);g.step(.3);
 assert.equal(g.useItem(0).ok,true);assert.equal(p.inventoryMeta[0].mode,'on');assert.ok(p.weaverShukuchi);assert.equal(Skills.hasStatusFlag(g,p,'invisible'),true);
});

test('Geminate still launches at an original target killed by the first shot but the dead target takes no further effects',()=>{
 const {g,p,e,c}=setup();c.y+=900;e.hp=1;p.attackCooldown=0;g._attack(p,e);g.step(.5);p.attackCooldown=999;g.step(.15);assert.equal(e.dead,true);
 g.time+=.05;Weaver.tickWeaverHero(g,p);assert.ok(g.pendingSpells.some(s=>s.targetId===e.id&&s.result?.weaverGeminate));
 tickAttacks(g);assert.equal(e.hp,0);assert.equal(g.pendingSpells.length,0);
});

test('A pending Geminate secondary attack preserves Smoke of Deceit applied after the original attack',()=>{
 const {g,p,e,c}=setup();c.y+=900;p.attackCooldown=0;g._attack(p,e);g.step(.5);p.attackCooldown=999;
 Skills.addStatus(g,p,'smoke',{invisible:true,smoked:true,positive:true,duration:3});g.step(.25);
 assert.equal(Skills.hasStatusFlag(g,p,'smoked'),true);assert.ok(g.pendingSpells.some(s=>s.result?.weaverGeminate));
});
