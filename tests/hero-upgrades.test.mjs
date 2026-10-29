import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import * as Skills from '../src/hero-runtime.js';
import { ABILITIES } from '../src/ability-data.js';

function arena(hero,ranks=[1,1,1,1]){
 const g=new Game({hero}),p=g.player,e=g.entities.find(u=>u.kind==='hero'&&u.team===1&&u.heroId==='crystal_maiden');
 g.entities=[p,e];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 Object.assign(p,{x:10400,y:10400,abilityLevels:ranks,skillPoints:0,maxMana:5000,mana:5000,attackCooldown:999,hpRegen:0});
 Object.assign(e,{x:10540,y:10400,maxHp:100000,hp:100000,maxMana:5000,mana:5000,hpRegen:0,armor:0,magicResistance:0,speed:0,aiTimer:Infinity,attackCooldown:999,abilityLevels:[0,0,0,0],skillPoints:0});
 g._index();return {g,p,e};
}

test('upgrades preserve four base ability slots and refresh skill cache when removed',()=>{
 for(const hero of Object.keys(ABILITIES))assert.equal(ABILITIES[hero].length,4);
 const {p}=arena('axe');const base=Skills.skillOf(p,2);assert.equal(base.cooldown,.3);
 p.hasScepter=true;assert.equal(Skills.skillOf(p,2).cooldown,0);
 p.hasScepter=false;assert.equal(Skills.skillOf(p,2).cooldown,.3);
 assert.equal(base.values.damage_reduction,0);
});

test('only the matching upgrade unlocks an independent extra skill',()=>{
 for(const [hero,id,flag]of [['crystal_maiden','crystal_maiden_crystal_clone','hasShard'],['juggernaut','juggernaut_swift_slash','hasScepter'],['windranger','windrunner_gale_force','hasShard'],['kunkka','kunkka_tidal_wave','hasShard']]){
  const {g,p,e}=arena(hero);assert.deepEqual(Skills.extraAbilities?.(p),[]);
  assert.equal(Skills.castExtraAbility?.(g,p,id,e)?.ok,false);p[flag]=true;
  assert.ok(Skills.extraAbilities(p).some(s=>s.id===id));assert.equal(Skills.extraSkillOf(p,id).level,1);
  p[flag]=false;assert.deepEqual(Skills.extraAbilities(p),[]);
 }
});

test('Axe Scepter counts outgoing attacks, has no Helix cooldown and reduces attacks only against Axe',()=>{
 const {g,p,e}=arena('axe',[0,0,4,0]);p.hasScepter=true;e.damage=100;
 for(let i=0;i<4;i++){p.attackCooldown=0;g._attack(p,e);}
 assert.equal(p.cooldowns[2],0);assert.ok(Object.values(e.statuses).some(s=>s.helixReduction===12&&s.stacks===1));
 assert.ok(Math.abs(Skills.attackModifiers(g,e,p).damage-88)<.01);
 const other={...p,id:'other',heroId:'crystal_maiden'};assert.equal(Skills.attackModifiers(g,e,other).damage,100);
 for(let i=0;i<24;i++){p.attackCooldown=0;g._attack(p,e);}
 assert.equal(Skills.attackModifiers(g,e,p).damage,40);
});

test('Axe Shard Call applies independent Hunger stacks and a kill clears all of them',()=>{
 const {g,p,e}=arena('axe');p.hasShard=true;
 g.cast(1,e);g.step(.31);p.cooldowns[0]=0;g.cast(0);g.step(.31);
 const stacks=Object.values(e.statuses).filter(s=>s.hunger);assert.equal(stacks.length,2);
 Skills.onUnitKilled(g,{id:'victim',kind:'creep',statuses:{},buffs:{}},e);
 assert.equal(Object.values(e.statuses).filter(s=>s.hunger).length,0);
});

test('Crystal Maiden Scepter field permits movement and another cast, then enemy stun interrupts it',()=>{
 const {g,p,e}=arena('crystal_maiden');p.hasScepter=true;
 assert.equal(g.cast(3).ok,true);assert.ok(p.freezingField);assert.equal(p.channel,undefined);
 const before=p.x;g.moveTo(before+500,p.y);g.step(.25);assert.ok(p.x>before);assert.ok(p.freezingField);
 assert.equal(g.cast(0,e).ok,true);g.step(.31);assert.ok(p.freezingField);
 Skills.applyStun(g,p,1,e);assert.equal(p.freezingField,null);
});

test('Crystal Maiden field applies Frostbite after its Scepter dwell time; base field stays channelled',()=>{
 const base=arena('crystal_maiden');base.g.cast(3);assert.equal(base.p.channel.kind,'freezing');base.g.moveTo(base.p.x+500,base.p.y);assert.equal(base.p.channel,null);
 const {g,p,e}=arena('crystal_maiden');p.hasScepter=true;g.cast(3);g.step(1.9);assert.equal(g.isRooted(e),false);g.step(.2);assert.equal(g.isRooted(e),true);
 assert.equal(Skills.skillOf(p,3).values.shard_bonus_explosion,20);
});

test('Crystal Clone leaves a damageable clone, moves the caster and explodes into Frostbite',()=>{
 const {g,p,e}=arena('crystal_maiden');p.hasShard=true;const start={x:p.x,y:p.y};
 assert.equal(Skills.castExtraAbility(g,p,'crystal_maiden_crystal_clone',{x:p.x-300,y:p.y}).ok,true);g.step(.31);
 const clone=g.entities.find(u=>u.crystalClone);assert.ok(clone);assert.ok(p.x<start.x-200);assert.equal(clone.x,start.x);
 g.damage(clone,1000,e,'pure');g.step(.05);assert.equal(g.isRooted(e),true);
});

test('Juggernaut Shard ward heals an extra 1.5 percent and takes exactly two hits',()=>{
 const {g,p,e}=arena('juggernaut');p.hasShard=true;g.cast(1,p);g.step(.31);
 const ward=g.entities.find(u=>u.kind==='ward');assert.equal(ward.healPct,3.5);assert.equal(ward.hitsRemaining,2);
 e.attackCooldown=0;g._attack(e,ward);assert.equal(ward.dead,false);e.attackCooldown=0;g._attack(e,ward);assert.equal(ward.dead,true);
});

test('Swift Slash shares Omnislash attack rules with separate duration and cooldown',()=>{
 const {g,p,e}=arena('juggernaut');p.hasScepter=true;const baseCooldown=p.cooldowns[3];
 assert.equal(Skills.castExtraAbility(g,p,'juggernaut_swift_slash',e).ok,true);g.step(.31);
 assert.ok(p.omnislash);assert.ok(Skills.isInvulnerable(g,p));assert.equal(p.cooldowns[3],baseCooldown);assert.ok(p.extraCooldowns.juggernaut_swift_slash>24);
 g.step(1.1);assert.equal(p.omnislash,null);assert.ok(e.hp<100000);
});

test('Windranger Scepter attack Tailwind lasts 3.5 seconds and survives dispels',()=>{
 const {g,p,e}=arena('windranger');p.hasScepter=true;p.attackCooldown=0;g._attack(p,e);
 assert.equal(p.tailwinds.length,1);assert.equal(p.tailwinds[0].duration,3.5);assert.equal(p.statuses.tailwind.undispellable,true);
 assert.equal(p.statuses.invisible,undefined);p.hasScepter=false;p.attackCooldown=0;g._attack(p,e);assert.equal(p.tailwinds.length,1);
});

test('Gale Force pushes enemies in the chosen direction without moving allies',()=>{
 const {g,p,e}=arena('windranger');p.hasShard=true;const x=e.x;
 assert.equal(Skills.castExtraAbility(g,p,'windrunner_gale_force',e).ok,true);g.step(.5);assert.ok(e.x>x);assert.equal(p.x,10400);
});

test('Kunkka Scepter queues two ships and cannon fire; Tidal Wave damages and carries enemies',()=>{
 const {g,p,e}=arena('kunkka');p.hasScepter=true;p.hasShard=true;g.cast(3,e);g.step(.31);
 const ships=g.pendingSpells.filter(s=>s.type==='ship');assert.equal(ships.length,2);assert.equal(ships[0].cannonVolleys,3);
 const x=e.x;assert.equal(Skills.castExtraAbility(g,p,'kunkka_tidal_wave',e).ok,true);g.step(1.5);assert.ok(e.x>x);assert.ok(e.hp<100000);
});

test('target spell blocking spends a released spell and invokes its cast hook only once',()=>{
 const {g,p,e}=arena('crystal_maiden');let casts=0,blocks=0;
 g.onSpellCast=()=>casts++;g.blockTargetSpell=()=>{blocks++;return true;};g.cast(1,e);g.step(.4);
 assert.equal(casts,1);assert.equal(blocks,1);assert.equal(g.isRooted(e),false);assert.ok(p.cooldowns[1]>0);assert.ok(p.mana<5000);
});

test('generic item status flags participate in immunity, control and dispels',()=>{
 const {g,p,e}=arena('axe');Skills.addStatus(g,p,'testBkb',{positive:true,duration:3,debuffImmune:true});
 assert.equal(Skills.debuffImmune(g,p),true);Skills.applyStun(g,p,1,e);assert.equal(g.isStunned(p),false);
 Skills.applyStun(g,p,1,e,true);assert.equal(g.isStunned(p),true);Skills.applyDispel(g,p,true);assert.equal(g.isStunned(p),false);
 Skills.addStatus(g,p,'customHex',{duration:1,hex:true});assert.equal(Skills.hasStatusFlag(g,p,'silenced'),true);
 Skills.addStatus(g,e,'customInvulnerable',{duration:1,invulnerable:true});assert.equal(Skills.isInvulnerable(g,e),true);
});
