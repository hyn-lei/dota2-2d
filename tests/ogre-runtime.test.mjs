import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import { BASES } from '../src/map-data.js';
import * as Inventory from '../src/inventory.js';
import * as Skills from '../src/hero-runtime.js';

function ogre(ranks=[1,1,1,0]){const a=arena('ogre_magi',ranks);assert.equal(a.p.heroId,'ogre_magi');a.g._random=()=>.99;return a;}
test('Fireblast respects cast point, rank damage, stun, resource cost and cooldown',()=>{
  const {g,p,e}=ogre();const mana=p.mana;assert.ok(g.cast(0,e).ok);g.step(.44);assert.equal(e.hp,4000);assert.equal(p.mana,mana);
  g.step(.06);assert.equal(e.hp,3930);assert.equal(p.mana,mana-70);assert.ok(g.isStunned(e));assert.ok(p.cooldowns[0]>10);
});
test('Multicast repeats actual Fireblast hits on the same target at 0.6 second intervals and pays once',()=>{
  const {g,p,e}=ogre([4,1,1,3]);g._random=()=>0;const mana=p.mana;g.cast(0,e);g.step(.5);assert.equal(e.hp,3750);assert.equal(p.mana,mana-115);
  g.step(.6);assert.equal(e.hp,3500);g.step(.6);assert.equal(e.hp,3250);g.step(.6);assert.equal(e.hp,3000);assert.equal(p.mana,mana-115);
});
test('Ignite has two real projectiles and damage only starts after flight',()=>{
  const {g,p,e,c}=ogre();g.cast(1,e);g.step(.4);assert.equal(e.hp,4000);assert.equal(c.hp,4000);
  g.step(1.1);assert.ok(e.statuses.ogreIgnite&&c.statuses.ogreIgnite);assert.ok(e.hp<4000&&c.hp<4000);
  assert.equal(e.statuses.ogreIgnite.slowPct,25);
});
test('Ignite refresh adds burn duration instead of replacing the remaining duration',()=>{
  const {g,p,e}=ogre();g.cast(1,e);g.step(1);const until=e.statuses.ogreIgnite.until;p.cooldowns[1]=0;
  g.cast(1,e);g.step(1);assert.ok(Math.abs(e.statuses.ogreIgnite.until-until-5)<1e-7);
});
test('Bloodlust targets allies, self and towers and applies actual attack speed and movement buffs',()=>{
  const {g,p,e}=ogre([1,1,4,0]);const attack=g.combatStats(p).attackSpeed,speed=g.combatStats(p).speed;
  assert.equal(g.cast(2,e).ok,false);assert.ok(g.cast(2,p).ok);g.step(.5);
  assert.equal(g.combatStats(p).attackSpeed,attack+100);assert.ok(Math.abs(g.combatStats(p).speed-speed*1.12)<1e-7);
  const tower=g._unit('tower',0,p.x+100,p.y,{range:700,damage:0,attackCooldown:999});g.entities.push(tower);p.cooldowns[2]=0;
  const before=g.combatStats(tower).attackSpeed;g.cast(2,tower);g.step(.5);assert.equal(g.combatStats(tower).attackSpeed,before+80);
});
test('Unrefined Fireblast consumes 35 percent current mana and adds strength damage',()=>{
  const {g,p,e}=ogre();p.hasScepter=true;p.mana=1000;
  assert.ok(Skills.castExtraAbility(g,p,'ogre_magi_unrefined_fireblast',e).ok);g.step(.5);
  assert.equal(p.mana,650);assert.equal(e.hp,4000-(150+1.5*p.strength));
  p.extraCooldowns.ogre_magi_unrefined_fireblast=0;p.mana=0;assert.ok(Skills.castExtraAbility(g,p,'ogre_magi_unrefined_fireblast',e).ok);
});
test('Fire Shield absorbs three hero attacks, ignores creep attacks, and counters with real projectiles',()=>{
  const {g,p,e,c}=ogre();p.hasShard=true;assert.ok(Skills.castExtraAbility(g,p,'ogre_magi_smash',p).ok);g.step(.3);
  p.armor=0;p.magicResistance=0;e.damage=100;e.attackCooldown=0;const hp=p.hp;
  assert.ok(g._attack(e,p));assert.ok(Math.abs(hp-p.hp-15)<1e-7);assert.equal(p.statuses.ogreFireShield.stacks,2);
  c.attackCooldown=0;c.x=p.x+50;g._attack(c,p);assert.equal(p.statuses.ogreFireShield.stacks,2);
  const enemyHp=e.hp;g.step(.3);assert.ok(e.hp<enemyHp);
  for(let i=0;i<2;i++){e.attackCooldown=0;g._attack(e,p);}assert.equal(p.statuses.ogreFireShield,undefined);
});
test('Break prevents multicast and strong dispel removes Fireblast stun',()=>{
  const {g,p,e}=ogre([4,1,1,3]);g._random=()=>0;Skills.addStatus(g,p,'break',{duration:5,break:true});g.cast(0,e);g.step(.5);assert.equal(e.hp,3750);
  Skills.applyDispel(g,e,true);assert.equal(g.isStunned(e),false);g.step(2);assert.equal(e.hp,3750);
});
test('targeted Dagon and Midas multicast without extra resource payments',()=>{
  const {g,p,e,c}=ogre([1,1,1,3]);g._random=()=>0;
  const extra=g._unit('creep',1,p.x+160,p.y+50,{maxHp:4000,armor:0,magicResistance:0,speed:0,attackCooldown:999,lane:1});g.entities.push(extra);
  p.inventory=['dagon'];Inventory.ensureInventory(p);g._refreshHero(p);p.mana=2000;
  const mana=p.mana;assert.ok(g.useItem(0,e).ok);assert.ok(e.hp<4000&&c.hp<4000&&extra.hp<4000);assert.equal(p.mana,mana-120);
  Object.assign(p,BASES[0]);p.inventory=['hand_of_midas'];p.inventoryMeta=[];Inventory.ensureInventory(p);g._refreshHero(p);
  for(const unit of [c,extra])Object.assign(unit,{x:p.x+100,y:p.y,dead:false,hp:4000,ancient:false,isRoshan:false});
  const charges=p.inventoryMeta[0].charges;g.useItem(0,c);assert.equal(p.inventoryMeta[0].charges,charges-1);assert.equal(c.dead,true);assert.equal(extra.dead,true);
});
