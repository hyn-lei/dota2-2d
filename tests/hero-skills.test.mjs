import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';

function arena(hero='kunkka',ranks=[0,0,0,0]) {
  const g=new Game({hero});
  const p=g.player,e=g.entities.find(u=>u.kind==='hero'&&u.team===1&&u.heroId==='crystal_maiden');
  g.entities=[p,e];g.nextWave=Infinity;g.nextNeutralSpawn=Infinity;g.roshanRespawnAt=Infinity;
  Object.assign(p,{x:10400,y:10400,abilityLevels:ranks,skillPoints:0,maxMana:2000,mana:2000,attackCooldown:999,hpRegen:0});
  Object.assign(e,{x:10540,y:10400,maxHp:10000,hp:10000,maxMana:2000,mana:2000,hpRegen:0,armor:0,magicResistance:0,speed:0,aiTimer:Infinity,attackCooldown:999,abilityLevels:[0,0,0,0],skillPoints:0});
  g._index();return {g,p,e};
}

test('level one starts with one point and casting an unlearned skill cannot spend mana',()=>{
  const g=new Game({hero:'kunkka'}),p=g.player,mana=p.mana;
  assert.deepEqual(p.abilityLevels,[0,0,0,0]);assert.equal(p.skillPoints,1);
  assert.equal(g.cast(0,{x:p.x+100,y:p.y}).ok,false);assert.equal(p.mana,mana);
  assert.equal(g.learnAbility(0).ok,true);assert.deepEqual(p.abilityLevels,[1,0,0,0]);
  assert.equal(g.learnAbility(1).ok,false);
});

test('Torrent damage depends on learned rank, not hero level, with cast point and delay',()=>{
  for(const level of [1,20]){
    const {g,p,e}=arena('kunkka',[1,0,0,0]);p.level=level;
    assert.equal(g.cast(0,e).ok,true);g.step(.39);assert.equal(p.mana,2000);
    g.step(.02);assert.equal(p.mana<2000,true);assert.ok(p.cooldowns[0]>15);
    g.step(1.57);assert.equal(e.hp,10000);
    g.step(1.7);assert.ok(Math.abs(e.hp-9890)<.01,`rank one damage at hero level ${level}: ${e.hp}`);
  }
});

test('moving during a cast point cancels its mana cost, cooldown and effects',()=>{
  const {g,p,e}=arena('kunkka',[1,0,0,0]);g.cast(0,e);g.step(.1);
  g.moveTo(10600,10600);g.step(3);
  assert.equal(p.cooldowns[0],0);assert.equal(p.mana,2000);assert.equal(e.hp,10000);
});

test('Tidebringer is a zero-mana attack modifier, consumes cooldown on hit, and respects its rank',()=>{
  const {g,p,e}=arena('kunkka',[0,1,0,0]);
  const behind={...e,id:'behind',x:e.x+250,y:e.y,statuses:{},buffs:{}};g.entities.push(behind);
  p.attackCooldown=0;const damage=p.damage;
  assert.equal(g._attack(p,e),true);assert.equal(p.mana,2000);
  assert.ok(Math.abs(10000-e.hp-(damage+35))<.001);
  assert.ok(Math.abs(10000-behind.hp-(damage+35)*1.5)<.001);assert.equal(p.cooldowns[1],13);
});

test('X Mark targets heroes, uses three/six seconds, and its free return works on cooldown',()=>{
  const {g,p,e}=arena('kunkka',[0,0,1,0]);const creep={...e,id:'creep',kind:'creep',x:e.x+300};g.entities.push(creep);
  assert.equal(g.cast(2,creep).ok,false);
  assert.equal(g.cast(2,e).ok,true);g.step(.4);assert.equal(p.xMark.targetId,e.id);
  e.x+=300;p.mana=0;assert.equal(g.cast(2).ok,true);assert.equal(e.x,10540);assert.equal(p.mana,0);
  p.cooldowns[2]=0;p.mana=2000;g.cast(2,p);g.step(.4);
  assert.ok(Math.abs(p.xMark.expiresAt-g.time-6)<.01);
});

test('Axe Call adds armor and taunts instead of applying a universal damage shield',()=>{
  const {g,p,e}=arena('axe',[1,0,0,0]);g.cast(0);g.step(.3);
  assert.ok(g.combatStats(p).armor>=p.armor+12);assert.equal(g._tauntSource(e),p);
  assert.equal(p.buffs.shieldUntil>g.time,false);
  assert.equal(g.combatStats(p).magicResistance,p.magicResistance);
});

test('Counter Helix is passive and triggers after seven landed attacks at rank one',()=>{
  const {g,p,e}=arena('axe',[0,0,1,0]);e.damage=1;p.hp=p.maxHp;
  assert.equal(g.cast(2).ok,false);
  for(let i=0;i<6;i++){e.attackCooldown=0;g._attack(e,p);}
  assert.equal(e.hp,10000);e.attackCooldown=0;g._attack(e,p);
  assert.equal(e.hp,9900);assert.equal(p.mana,2000);
});

test('Culling Blade uses flat pure damage and resets only on a hero kill',()=>{
  const {g,p,e}=arena('axe',[0,0,0,1]);e.hp=300;
  g.cast(3,e);g.step(.3);assert.equal(e.hp,25);assert.ok(p.cooldowns[3]>79);
  p.cooldowns[3]=0;g.cast(3,e);g.step(.3);assert.equal(e.dead,true);assert.equal(p.cooldowns[3],0);
  assert.equal(p.cullingStacks,1);
});

test('Frostbite roots and disarms, while normal movement commands and spells keep distinct rules',()=>{
  const {g,p,e}=arena('crystal_maiden',[0,1,0,0]);g.cast(1,e);g.step(.3);
  assert.equal(g.isRooted(e),true);assert.equal(g.isStunned(e),false);
  e.attackCooldown=0;assert.equal(g._attack(e,p),false);
  const x=e.x;g._move(e,{x:x+500,y:e.y},1);assert.equal(e.x,x);
  g.step(1.5);assert.ok(Math.abs(e.hp-9850)<.01);assert.equal(g.isRooted(e),false);
});

test('Arcane Aura is a passive global mana regeneration effect with a proximity bonus',()=>{
  const {g,p,e}=arena('crystal_maiden',[0,0,1,0]);e.team=0;e.x=p.x+3000;e.mana=0;e.manaRegen=0;
  assert.equal(g.cast(2).ok,false);g.step(1);assert.ok(Math.abs(e.mana-.4)<.01);
  e.x=p.x+300;e.mana=0;g.step(1);assert.ok(Math.abs(e.mana-1.2)<.01);
});

test('Healing Ward persists and heals by max health rather than instantly healing on cast',()=>{
  const {g,p}=arena('juggernaut',[0,1,0,0]);p.hp=p.maxHp/2;
  const hp=p.hp;g.cast(1,p);g.step(.3);assert.ok(g.entities.some(e=>e.kind==='ward'));
  assert.ok(p.hp-hp<p.maxHp*.01);g.step(1);assert.ok(p.hp-hp>=p.maxHp*.02);
});

test('Blade Dance is a passive critical strike and cannot be used to dash',()=>{
  const {g,p,e}=arena('juggernaut',[0,0,1,0]);assert.equal(g.cast(2,e).ok,false);
  g._random=()=>0;p.attackCooldown=0;const damage=p.damage;
  g._attack(p,e);assert.ok(Math.abs(10000-e.hp-damage*1.4)<.01);
});

test('Windrun evades attacks but does not block magical damage',()=>{
  const {g,p,e}=arena('windranger',[0,0,1,0]);g.cast(2);g.step(.3);
  const hp=p.hp;e.attackCooldown=0;g._attack(e,p);assert.equal(p.hp,hp);
  g.damage(p,100,e,'magical');assert.ok(p.hp<hp);assert.ok(g.combatStats(p).speed>p.speed);
});

test('Shackleshot binds a target and a unit behind it; isolated targets get only the failure stun',()=>{
  const {g,p,e}=arena('windranger',[1,0,0,0]);
  const behind={...e,id:'behind',x:e.x+300,statuses:{},buffs:{}};g.entities.push(behind);
  g.cast(0,e);g.step(.4);assert.equal(g.isStunned(e),true);assert.equal(g.isStunned(behind),true);
  assert.ok(e.statuses.stun.until-g.time>1.3);
});

test('status timers pause, expire and disappear without changing the stored base attributes',()=>{
  const {g,p}=arena('windranger',[0,0,1,0]);const speed=p.speed;
  g.cast(2);g.step(.3);const until=p.statuses.windrun.until;
  g.setPaused(true);g.step(20);assert.equal(p.statuses.windrun.until,until);
  g.setPaused(false);g.step(3.1);assert.equal(g.combatStats(p).speed,speed);assert.equal(p.statuses.windrun,undefined);
});
