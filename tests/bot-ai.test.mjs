import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import { BASES } from '../src/map-data.js';
import * as Inventory from '../src/inventory.js';
import * as Courier from '../src/courier.js';
import { tickBotShopping } from '../src/bot-items.js';

function botArena(hero='juggernaut',difficulty='normal'){
  const a=arena(hero);a.g.difficulty=difficulty;a.p.isPlayer=false;a.e.isPlayer=true;
  a.p.aiTimer=0;a.p.skillPoints=0;return a;
}
function shopTick(g,p,n=20){for(let i=0;i<n;i++){g.time+=.6;p.aiTimer=0;g._botTick(p,0);}}

test('bots continue shopping past five carried items plus their teleport scroll',()=>{
  const {g,p}=botArena();Object.assign(p,BASES[0]);p.inventory=['boots','bracer','blade','chainmail','diadem'];p.gold=20000;Inventory.ensureInventory(p);g._refreshHero(p);
  shopTick(g,p,30);
  assert.ok(p.botShop?.spent>2000,'existing six total entries must not freeze the build, even when selling refunds gold');
  assert.ok(Inventory.itemEntries(p).some(e=>['phase_boots','bfury','manta','black_king_bar'].includes(e.id)));
});

test('five hero bots follow different equipment routes',()=>{
  const signatures=[];
  for(const hero of ['juggernaut','crystal_maiden','windranger','axe','kunkka']){
    const {g,p}=botArena(hero);Object.assign(p,BASES[0]);p.gold=12000;shopTick(g,p,14);
    signatures.push(Inventory.itemEntries(p,['inventory','backpack']).map(e=>e.id).sort().join('|'));
  }
  assert.ok(new Set(signatures).size>=4,'hero roles must not share the same generic six purchases');
});

test('bots purchase affordable components instead of waiting for the full next item price',()=>{
  const {g,p}=botArena('axe');Object.assign(p,BASES[0]);p.inventory=['boots'];p.gold=250;Inventory.ensureInventory(p);g._refreshHero(p);
  shopTick(g,p,3);assert.ok(p.gold<250);assert.ok(p.gold>=0);
});

test('courier-delivered recipe parts actually assemble into usable equipment',()=>{
  const {g,p}=botArena();p.inventory=['boots'];Inventory.ensureInventory(p);
  const courier=Courier.ensureCourier(g,p);Object.assign(courier,{x:p.x,y:p.y,command:'deliver',cargo:['chainmail','attackblade'],cargoMeta:['chainmail','attackblade'].map(id=>Inventory.createMeta(p,id))});
  Courier.tickCouriers(g,.05);
  assert.ok(p.inventory.includes('phase_boots'),'arrival must assemble components outside the base');
  assert.equal(courier.cargo.filter(Boolean).length,0);
});

test('every enemy tier reacts substantially faster while keeping easy, normal and hard ordered',()=>{
  const intervals=[];
  for(const difficulty of ['easy','normal','hard']){
    const {g,p}=botArena('axe',difficulty);p.team=1;p.gold=0;g.entities=[p];g._index();g._botTick(p,.05);intervals.push(p.aiTimer);
  }
  assert.ok(intervals[0]<=.45);assert.ok(intervals[1]<intervals[0]);assert.ok(intervals[2]<intervals[1]);
});

test('ranged AI uses attack cooldown to kite a nearby melee opponent',()=>{
  const {g,p,e}=botArena('windranger');g.entities=[p,e];p.abilityLevels=[0,0,0,0];p.mana=0;p.gold=0;p.attackCooldown=.8;e.x=p.x+180;
  const before=Math.hypot(p.x-e.x,p.y-e.y);g._index();g._botTick(p,.2);
  assert.ok(Math.hypot(p.x-e.x,p.y-e.y)>before,'ranged hero should create space between attacks');
});

test('AI avoids committing into an unsupported enemy tower',()=>{
  const {g,p,e}=botArena('juggernaut');p.abilityLevels=[0,0,0,0];p.gold=0;p.hp=p.maxHp*.55;
  e.x=p.x+200;e.hp=e.maxHp;const tower=g._unit('tower',1,p.x+360,p.y,{range:700,damage:120});g.entities=[p,e,tower];g._index();
  const before=p.x;g._botTick(p,.2);assert.ok(p.x<before,'unsupported pursuit should yield to tower danger');
});

test('AI activates Black King Bar in an actual hero fight',()=>{
  const {g,p,e}=botArena('crystal_maiden');p.inventory=['black_king_bar'];Inventory.ensureInventory(p);g._refreshHero(p);p.mana=p.maxMana;
  g.entities=[p,e];e.x=p.x+200;g._index();g._botTick(p,.05);
  assert.ok(Object.values(p.statuses).some(s=>s.debuffImmune),'owned active equipment must be used');
  assert.ok(p.inventoryMeta[0].cooldownRemaining>0);
});

test('full equipment does not strand a delivered permanent upgrade in the backpack',()=>{
  const {g,p}=botArena('axe');g.time=1200;Object.assign(p,BASES[0]);p.gold=0;
  p.inventory=['phase_boots','overwhelming_blink','blade_mail','black_king_bar','heart','assault'];p.backpack=['aghanims_shard'];Inventory.ensureInventory(p);g._refreshHero(p);
  tickBotShopping(g,p);Inventory.tickInventory(g,p);
  assert.equal(p.consumedShard,true);assert.ok(p.inventory.includes('phase_boots'),'keep an upgraded boot equipped');
});

test('a bot with real courier trips can finish secret-shop upgrades without repeat purchases',()=>{
  const {g,p}=botArena('juggernaut');g.time=1200;Object.assign(p,BASES[0]);p.level=25;p.gold=100000;
  for(let i=0;i<300;i++){g.time+=.6;p.aiTimer=0;g._botTick(p,0);Courier.tickCouriers(g,.6);Inventory.tickInventory(g,p);}
  assert.ok(p.botShop.completed.length>=11,'shopping must progress through late upgrades');
  assert.equal(p.consumedShard,true);assert.equal(p.consumedScepter,true);
  assert.ok(p.gold>=0);assert.ok(p.botShop.purchases<65,'in-transit parts must not be bought repeatedly');
});

test('returning to base never repurchases components already on its courier',()=>{
  const {g,p}=botArena();Object.assign(p,BASES[0]);p.inventory=['boots','wraith_band','magic_wand'];p.gold=2000;Inventory.ensureInventory(p);
  const c=Courier.ensureCourier(g,p);Object.assign(c,{x:p.x+1000,y:p.y,command:'deliver',cargo:['chainmail','attackblade'],cargoMeta:['chainmail','attackblade'].map(id=>Inventory.createMeta(p,id))});
  tickBotShopping(g,p);
  assert.equal(p.gold,2000,'in-transit upgrade components must not be purchased a second time');
});

test('retreating caster turns away before using Force Staff',()=>{
  const {g,p,e}=botArena('crystal_maiden');p.abilityLevels=[0,0,0,0];p.gold=0;p.inventory=['force_staff'];Inventory.ensureInventory(p);g._refreshHero(p);p.mana=p.maxMana;p.hp=p.maxHp*.3;p.angle=0;e.x=p.x+200;
  g.entities=[p,e];g._index();g._botTick(p,.1);
  assert.ok(!p.forcedMotion||p.forcedMotion.to.x<=10400,'escape force must never push towards the enemy');
});

test('outnumbered retreat forbids an offensive blink even with healthy hit points',()=>{
  const {g,p,e}=botArena('axe');p.abilityLevels=[0,0,0,0];p.gold=0;p.inventory=['blink'];Inventory.ensureInventory(p);g._refreshHero(p);p.hp=p.maxHp*.6;e.x=p.x+800;e.damage=200;
  const second={...e,id:'other-enemy',x:e.x+50,statuses:{},buffs:{}};g.entities=[p,e,second];g._index();
  const x=p.x;g._botTick(p,.1);assert.ok(p.x<=x);assert.equal(p.inventoryMeta[0].cooldownRemaining,0);
});

test('secret-shopping stops when the courier has assembled Moon Shard',()=>{
  const {g,p}=botArena('juggernaut');g.time=1200;p.gold=10000;p.inventory=[];
  p.botShop={completed:Array.from({length:12},(_,i)=>i),targets:{},nextAt:0,purchases:0,spent:0};
  const c=Courier.ensureCourier(g,p);Object.assign(c,{...Inventory.SECRET_SHOPS[0],command:'shopping',cargo:[],cargoMeta:[]});
  tickBotShopping(g,p);
  assert.equal(p.gold,6000);assert.deepEqual(c.cargo.filter(Boolean),['moon_shard']);
});

test('bots replace a consumed TP scroll once without buying duplicates in transit',()=>{
  const {g,p}=botArena('axe');p.tp=[];p.tpMeta=[];p.gold=300;g.time=20;
  tickBotShopping(g,p);const after=p.gold;
  assert.ok(Inventory.itemEntries(p).some(e=>e.id==='tpscroll'));assert.ok(after<300);
  g.time+=1;tickBotShopping(g,p);assert.equal(Inventory.itemEntries(p).filter(e=>e.id==='tpscroll').length,1);
});
