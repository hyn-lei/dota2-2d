import { arena } from './skill-arena.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { BASES, ITEMS } from '../src/data.js';
import { navigation } from '../src/navigation.js';

const advance = (game, seconds) => { for (let t = 0; t < seconds - 1e-8; t += .1) game.step(Math.min(.1, seconds - t)); };
const isolated = (hero = 'juggernaut') => {
  const game = new Game({hero});
  game.entities = game.entities.filter(e => e.isPlayer || e.kind === 'ancient' || e.kind === 'tower' || e.kind === 'fountain');
  game.nextWave = Infinity;
  game.nextNeutralSpawn=Infinity;
  return game;
};

test('initial state is a complete deterministic 5v5 battlefield', () => {
  const a = new Game(), b = new Game();
  assert.equal(a.entities.filter(e => e.kind === 'hero').length, 10);
  assert.equal(a.entities.filter(e => e.kind === 'tower').length, 22);
  assert.equal(a.entities.filter(e => e.kind === 'ancient').length, 2);
  assert.equal(a.player.gold, 600);
  assert.equal(new Set(a.entities.map(e => e.id)).size, a.entities.length);
  advance(a, 4); advance(b, 4);
  assert.deepEqual(a.entities, b.entities);
  assert.equal(a.entities.filter(e => e.kind === 'creep').length, 24);
});

test('click movement, keyboard movement, pause, and stopped inputs behave coherently', () => {
  const g = isolated(); const p = g.player;
  g.moveTo(p.x + 500, p.y); const start = p.x;
  advance(g, 1); assert.ok(p.x > start + 150);
  g.setPaused(true); const state = JSON.stringify(g.entities), time = g.time;
  advance(g, 2); assert.equal(g.time, time); assert.equal(JSON.stringify(g.entities), state);
  g.setPaused(false); g.setMovement(0, -1); const y = p.y;
  advance(g, .5); assert.ok(p.y < y);
  g.setMovement(0, 0); const x = p.x; advance(g, .5); assert.ok(p.x > x);
});

test('waves spawn four units per lane and team every thirty seconds', () => {
  const g = new Game(); advance(g, .1); assert.equal(g.wave, 1);
  assert.equal(g.entities.filter(e => e.kind === 'creep').length, 24);
  advance(g, 29.8); assert.equal(g.wave,1);
  advance(g, .2); assert.equal(g.wave, 2);
  for (let team = 0; team < 2; team++) for (let lane = 0; lane < 3; lane++) {
    assert.ok(g.entities.some(e => e.kind === 'creep' && e.team === team && e.lane === lane));
  }
});

test('learned offensive spells enforce cost and cooldown across all cast styles',()=>{
 for(const [hero,index]of [['juggernaut',0],['crystal_maiden',0],['windranger',1]]){
  const {g,p,e}=arena(hero);const mana=p.mana;assert.equal(g.cast(index,e).ok,true);
  g.step(.4);assert.ok(p.mana<mana);assert.ok(p.cooldowns[index]>0);
  g.step(1.1);assert.ok(e.hp<4000);assert.equal(g.cast(index,e).ok,false);
  p.mana=0;assert.equal(g.cast(3,e).ok,false);
 }
});

test('shopping applies equipped bonuses, preserves economy, and keeps overflow inactive', () => {
  const g = isolated(), p = g.player, speed = p.speed;
  assert.equal(g.buy('boots').ok, true); assert.equal(p.speed, speed + 45); assert.equal(p.gold, 100);
  assert.equal(g.buy('relic').ok, false); assert.equal(g.buy('unknown').ok, false);
  p.gold = 10000;
  while (p.inventory.length < 6) assert.equal(g.buy('blade').ok, true);
  assert.equal(g.buy('boots').ok, true);assert.deepEqual(p.backpack,['boots']);assert.equal(p.speed,speed+45);
  g.damage(p, 1e6, {team:1}); assert.equal(g.buy('boots').ok, true);assert.deepEqual(p.stash,['boots']);
});

test('lane tiers and both T4 towers must fall before Ancient victory', () => {
  const g = isolated(), source = g.player;
  const outer = g.entities.find(e => e.team === 1 && e.kind === 'tower' && e.lane === 1 && e.tier === 1);
  const inner = g.entities.find(e => e.team === 1 && e.kind === 'tower' && e.lane === 1 && e.tier === 2);
  const ancient = g.entities.find(e => e.team === 1 && e.kind === 'ancient');
  assert.equal(g.isProtected(inner), true); assert.equal(g.isProtected(ancient), true);
  const hp = inner.hp; g.damage(inner, 1e6, source); assert.equal(inner.hp, hp);
  g.damage(outer, 1e6, source); assert.equal(outer.dead, true); assert.equal(g.isProtected(inner), false);
  g.damage(inner, 1e6, source); assert.equal(g.isProtected(ancient), true);
  const high=g.entities.find(e=>e.team===1&&e.kind==='tower'&&e.tier===3&&e.lane===1);
  g.damage(high,1e6,source);
  for(const tower of g.entities.filter(e=>e.team===1&&e.kind==='tower'&&e.tier===4))g.damage(tower,1e6,source);
  assert.equal(g.isProtected(ancient),false);
  g.damage(ancient, 1e6, source); assert.equal(g.status, 'won'); assert.equal(g.winner, 0);
  const time = g.time; advance(g, 1); assert.equal(g.time, time);
});

test('recall consumes a scroll and mana, survives ordinary damage, and returns to fountain', () => {
  const g = isolated(), p = g.player; p.x = 1100; p.y = 900;
  const mana=p.mana;assert.equal(p.tp[0],'tpscroll');
  assert.equal(g.recall().ok, true);assert.equal(p.mana,mana-75);assert.equal(p.tp[0],undefined);
  advance(g,1);g.damage(p,10,{team:1});assert.ok(p.itemChannel);
  advance(g,2.1);assert.ok(Math.hypot(p.x-BASES[0].x,p.y-BASES[0].y)<250);
  assert.ok(p.itemCooldowns.teleport>76);assert.equal(g.recall().ok,false);
});

test('death awards kills, blocks actions, and respawns with equipment and clean targets', () => {
  const g = isolated(), p = g.player; g.buy('boots');
  const killer = {id:'enemy',kind:'hero',team:1,kills:0,gold:0};
  g.damage(p, 1e6, killer); assert.equal(p.dead, true); assert.equal(p.deaths, 1);
  assert.equal(g.score[1], 1); assert.equal(killer.kills, 1);
  assert.equal(g.cast(0).ok, false); assert.equal(g.recall().ok, false);
  const x = p.x; g.moveTo(1000, 500); advance(g, 1); assert.equal(p.x, x);
  advance(g, 11.1); assert.equal(p.dead, false); assert.equal(p.hp, p.maxHp);
  assert.deepEqual(p.inventory, ['boots']); assert.equal(p.targetId, null);
});

test('last hits give gold and nearby experience; bot armies leave base and fight', () => {
  const g = new Game(), p = g.player;
  advance(g, .1);
  const creep = g.entities.find(e => e.kind === 'creep' && e.team === 1);
  p.x = creep.x; p.y = creep.y;
  const gold = p.gold, xp = p.xp; g.damage(creep, 1e6, p);
  assert.equal(p.lastHits, 1); assert.ok(p.gold > gold); assert.ok(p.xp > xp);
  advance(g, 35);
  assert.ok(g.entities.filter(e => e.kind === 'hero' && !e.isPlayer).some(e => Math.hypot(e.x-BASES[e.team].x,e.y-BASES[e.team].y)>600));
  assert.ok(g.entities.some(e => e.hp < e.maxHp || e.dead));
});

test('Omnislash grants real invulnerability and its repeated attacks end on time',()=>{
 const {g,p,e}=arena('juggernaut');g.cast(3,e);g.step(.3);const hp=p.hp;
 g.damage(p,1000,e,'pure');assert.equal(p.hp,hp);assert.ok(e.hp<4000);
 g.step(3.1);const after=p.hp;g.damage(p,100,e,'pure');assert.equal(p.hp,after-100);assert.equal(p.omnislash,null);
});
test('Freezing Field channels, produces explosions, and movement cancels the channel',()=>{
 const {g,p,e}=arena('crystal_maiden');g._random=()=>0;e.x=p.x+195;e.y=p.y;
 assert.equal(g.cast(3).ok,true);g.step(.2);assert.ok(e.hp<4000);assert.ok(p.channel);
 g.moveTo(p.x+500,p.y);assert.equal(p.channel,null);assert.equal(p.statuses.channel,undefined);
});
test('Focus Fire modifies attack speed and damage only against its selected target',()=>{
 const {g,p,e,c}=arena('windranger');const base=g.combatStats(p,e);g.cast(3,e);
 const focus=g.combatStats(p,e);assert.equal(focus.attackSpeed,base.attackSpeed+350);assert.equal(focus.damage,base.damage*.75);
 assert.equal(g.combatStats(p,c).attackSpeed,base.attackSpeed);assert.equal(g.combatStats(p,c).damage,base.damage);
});

test('Frostbite stops creep movement and attacks until expiry; Nova uses its real rank slow',()=>{
 const {g,p,c}=arena('crystal_maiden');g.cast(1,c);g.step(.3);c.speed=325;const x=c.x;
 g.step(.5);assert.equal(c.x,x);c.x=p.x+45;c.attackCooldown=0;assert.equal(g._attack(c,p),false);
 g.step(1.1);c.attackCooldown=0;assert.equal(g._attack(c,p),true);
 p.cooldowns[0]=0;g.cast(0,c);g.step(.3);assert.ok(Math.abs(g.combatStats(c).speed-260)<.01);
});

test('Frostbite roots enemy heroes without silencing them, and Nova slow persists afterward',()=>{
 const {g,p,e}=arena('crystal_maiden');g.cast(1,e);g.step(.3);e.speed=280;const x=e.x;
 g._move(e,{x:x+300,y:e.y},.5);assert.equal(e.x,x);assert.equal(g.isStunned(e),false);
 g.cast(0,e);g.step(.3);assert.ok(Math.abs(g.combatStats(e).speed-224)<.01);
 g.step(1.3);assert.equal(g.isRooted(e),false);assert.ok(e.statuses.nova);
});

test('pause blocks purchases and combat commands; death blocks movement and casting', () => {
  const g=isolated(); const p=g.player;
  g.recall(); g.setPaused(true);
  g.setMovement(1,0); g.moveTo(10400,10400);
  assert.equal(p.recallTimer,3); assert.equal(g.cast(0).ok,false);
  assert.equal(g.buy('boots').ok,false); assert.equal(g.recall().ok,false);
  g.setPaused(false); g.damage(p,1e6,{team:1}); g.setMovement(1,0);
  assert.deepEqual(g.keyboard,{x:0,y:0});
});

test('difficulty changes enemy decision speed while preserving actual hero attributes', () => {
  const easy=new Game({difficulty:'easy'}), hard=new Game({difficulty:'hard'});
  assert.equal(easy.player.maxHp,hard.player.maxHp);
  const e=easy.entities.find(e=>e.kind==='hero'&&e.team===1),h=hard.entities.find(e=>e.kind==='hero'&&e.team===1);
  assert.equal(e.maxHp,h.maxHp);assert.equal(e.damage,h.damage);
  easy.step(.05);hard.step(.05);
  assert.ok(e.aiTimer>h.aiTimer);
});

test('a standard-pace match has real combat and objective progress without an early forced result', () => {
  const g=new Game({seed:42});
  advance(g,600);
  assert.equal(g.status,'playing');
  assert.ok(g.entities.some(e=>e.kind==='tower'&&e.dead));
  assert.ok(g.entities.filter(e=>e.kind==='ancient').every(e=>!e.dead));
  // Better retreats reduce deaths; real hero combat should not require a fixed death budget.
  assert.ok(g.score[0]+g.score[1]>0);
  assert.ok(g.entities.filter(e=>e.kind==='hero'&&!e.isPlayer).every(h=>(h.botShop?.spent||0)>500));
  for (const e of g.entities) {
    assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp));
    assert.ok(e.attackCooldown>=0);
    if (e.kind==='hero') assert.ok(e.respawnTimer>=0 && e.cooldowns.every(c=>c>=0));
  }
});

test('Aegis survives ordinary damage and reincarnates only after a lethal hit',()=>{
  const g=isolated('kunkka'),p=g.player;
  Object.assign(p,{x:10400,y:10400,aegisUntil:300});
  g.damage(p,10,{team:1},'pure');
  assert.equal(p.aegisUntil,300);assert.equal(p.dead,false);
  g.damage(p,1e6,{team:1},'pure');
  assert.equal(p.dead,true);assert.equal(p.respawnTimer,5);assert.equal(p.aegisUntil,0);
  assert.equal(p.deaths,0);assert.deepEqual(g.score,[0,0]);
  advance(g,5.05);assert.equal(p.dead,false);assert.equal(p.hp,p.maxHp);
  assert.equal(p.x,10400);assert.equal(p.y,10400);
});
