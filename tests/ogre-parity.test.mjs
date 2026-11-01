import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import * as Skills from '../src/hero-runtime.js';
import * as Inventory from '../src/inventory.js';
import * as Progression from '../src/progression.js';
import { ITEM_BY_ID } from '../src/item-data.js';
import { multicastChances } from '../src/ogre-runtime.js';
function setup(ranks=[4,1,4,0]){const a=arena('ogre_magi',ranks);a.g._random=()=>.99;return a;}
test('7.40 talent points are independent of ability points',()=>{
  const h={heroId:'ogre_magi',level:1};Progression.initializeProgression(h);h.level=10;Progression.grantLevelPoints(h,1);
  assert.equal(h.talentPoints,1);const skillPoints=h.skillPoints;assert.ok(Progression.learnTalent(h,1).ok);assert.equal(h.skillPoints,skillPoints);assert.equal(h.talentPoints,0);
  h.level=30;Progression.grantLevelPoints(h,10);assert.equal(h.talentPoints+h.talents.length,8);
});
test('strength never unlocks a zero multicast tier',()=>{
  const {p}=setup([4,1,4,1]);assert.deepEqual(multicastChances(p),[76.625,0,0]);
  p.talents=[7];assert.deepEqual(multicastChances(p),[86.625,11.625,11.625]);
});
test('Bloodlust uses self values and prioritizes unbuffed allies',()=>{
  const {g,p,e}=setup([4,1,4,3]);g._random=()=>0;e.team=0;
  const tower=g._unit('tower',0,p.x+180,p.y,{damage:0,range:700,attackCooldown:999});
  const creep=g._unit('creep',0,p.x+120,p.y,{lane:1,speed:0,attackCooldown:999});g.entities=[p,e,tower,creep];
  g.cast(2,e);g.step(.5);assert.equal(p.statuses.ogreBloodlust.attackSpeed,100);assert.equal(e.statuses.ogreBloodlust.attackSpeed,80);
  assert.ok(tower.statuses.ogreBloodlust&&creep.statuses.ogreBloodlust);
});
test('Bloodlust rejects invulnerable units but accepts invulnerable buildings',()=>{
  const {g,p,e}=setup();e.team=0;Skills.addStatus(g,e,'invulnerable',{duration:10,positive:true,invulnerable:true});assert.equal(g.cast(2,e).ok,false);
  const tower=g._unit('tower',0,p.x+160,p.y,{damage:0,range:700,attackCooldown:999});Skills.addStatus(g,tower,'invulnerable',{duration:10,positive:true,invulnerable:true});g.entities.push(tower);
  assert.ok(g.cast(2,tower).ok);g.step(.5);assert.ok(tower.statuses.ogreBloodlust);
});
test('debuff immunity suppresses Fireblast stun without discarding its remaining duration',()=>{
  const {g,p,e}=setup();Skills.addStatus(g,e,'immunity',{duration:.8,positive:true,debuffImmune:true});g.cast(0,e);g.step(.5);
  assert.equal(e.hp,3750);assert.equal(g.isStunned(e),false);g.step(.4);assert.equal(g.isStunned(e),true);
});
test('7.32 Ignite first tick is delayed 0.1 seconds and its total remains five ticks',()=>{
  const {g,p,e}=setup();g.entities=[p,e];g.cast(1,e);g.step(.5);assert.equal(e.hp,4000);g.step(.1);assert.equal(e.hp,3980);
  g.step(5);assert.equal(e.hp,3900);
});
test('Ignite still deals reduced magical damage during debuff immunity',()=>{
  const {g,p,e}=setup();Skills.addStatus(g,e,'immunity',{duration:2,positive:true,debuffImmune:true,magicResistancePct:50});g.cast(1,e);g.step(.8);
  assert.ok(e.statuses.ogreIgnite);assert.ok(e.hp<4000);
});
test('damage immunity prevents consuming Fire Shield charges or firing counters',()=>{
  const {g,p,e}=setup();p.hasShard=true;Skills.castExtraAbility(g,p,'ogre_magi_smash',p);g.step(.3);Skills.addStatus(g,p,'noDamage',{duration:2,positive:true,damageImmunity:true});
  e.attackCooldown=0;e.damage=100;const hp=p.hp;g._attack(e,p);assert.equal(p.hp,hp);assert.equal(p.statuses.ogreFireShield.stacks,3);
  assert.equal(g.pendingSpells.some(s=>s.type==='ogre:shieldCounter'),false);
});
test('ordinary blocked Fireblast cancels its entire multicast sequence',()=>{
  const {g,p,e}=setup([4,1,4,3]);g._random=()=>0;Skills.addStatus(g,e,'spellBlock',{duration:10,positive:true,spellBlock:true});g.cast(0,e);g.step(2.5);
  assert.equal(e.hp,4000);
});
test('every ordinary Fireblast multicast instance can reflect',()=>{
  const {g,p,e}=setup([4,1,4,3]);g._random=()=>0;p.maxHp=p.hp=4000;Skills.addStatus(g,e,'reflect',{duration:10,positive:true,spellReflect:true});g.cast(0,e);g.step(2.5);
  assert.equal(e.hp,3000);assert.equal(p.hp,3250);
});
test('attack-talent Fireblast and its multicasts bypass spell block even during Break',()=>{
  const {g,p,e}=setup([4,1,4,3]);g._random=()=>0;p.talents=[6];Skills.addStatus(g,p,'broken',{duration:5,break:true});Skills.addStatus(g,e,'block',{duration:5,positive:true,spellBlock:true});
  p.attackCooldown=0;g._attack(p,e);g.step(.3);p.attackCooldown=999;assert.ok(e.hp<4000-p.damage-200);assert.ok(e.statuses.block);
});
test('item multicast excludes friendly casts and obeys cast range plus 600',()=>{
  const {g,p,e,c}=setup([4,1,4,3]);g._random=()=>0;e.team=0;p.inventory=['lotus_orb'];Inventory.ensureInventory(p);g._refreshHero(p);p.mana=2000;g.useItem(0,p);
  assert.equal(Object.values(e.statuses).some(s=>s.spellReflect),false);
  e.team=1;e.x=p.x+150;p.inventory=['dagon'];p.inventoryMeta=[];Inventory.ensureInventory(p);g._refreshHero(p);c.x=p.x+ITEM_BY_ID.dagon.range+p.castRangeBonus+601;p.mana=2000;g.useItem(0,e);assert.equal(c.hp,4000);
  p.inventory=['rod_of_atos'];p.inventoryMeta=[];Inventory.ensureInventory(p);g._refreshHero(p);p.mana=2000;c.x=p.x+ITEM_BY_ID.rod_of_atos.range+599;g.useItem(0,e);assert.ok(g.isRooted(c));
});
test('Ignite tracks a moving target instead of resolving at the original distance',()=>{
  const {g,p,e}=setup();e.x=p.x+400;g.entities=[p,e];g.cast(1,e);g.step(.35);e.x=p.x+1000;g.step(.45);
  assert.equal(e.statuses.ogreIgnite,undefined);g.step(.7);assert.ok(e.statuses.ogreIgnite);
});
test('attack proc uses pseudo-random accumulated failure chance',()=>{
  const {g,p,e}=setup([4,1,4,0]);p.talents=[6];g._random=()=>.06;p.attackCooldown=0;g._attack(p,e);g.step(.3);
  const first=e.hp;p.attackCooldown=0;g._attack(p,e);g.step(.3);assert.ok(first-e.hp>p.damage+200);
});
test('Bloodlust autocast can be enabled without spending mana and casts on an attacker',()=>{
  const {g,p}=setup();const mana=p.mana;assert.ok(g.toggleAutocast(2).ok);assert.equal(p.mana,mana);g.step(.8);
  assert.ok(p.statuses.ogreBloodlust);assert.equal(p.mana,mana-70);
});
test('Ogre melee attacks use its official 0.3 attack point scaled by attack speed',()=>{
  const {g,p,e}=setup();p.attackCooldown=0;const hp=e.hp;assert.ok(g._attack(p,e));assert.equal(e.hp,hp);
  g.step(.25);assert.equal(e.hp,hp);g.step(.05);assert.equal(e.hp,hp-p.damage);
});
test('Ogre AI uses owned Midas on farm targets',()=>{
  const {g,p,c}=setup([4,1,4,1]);g.entities=[p,c];p.isPlayer=false;p.gold=0;p.aiTimer=0;p.inventory=['hand_of_midas'];p.inventoryMeta=[];Inventory.ensureInventory(p);g._refreshHero(p);g._index();
  g._botTick(p,.05);assert.equal(c.dead,true);assert.equal(p.inventoryMeta[0].charges,1);
});
