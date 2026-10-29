import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { WORLD, BASES } from '../src/data.js';

const advance = (g, seconds) => g.step(seconds);
const quiet = () => {
  const g = new Game({hero:'kunkka'});
  g.entities = g.entities.filter(e => e.kind !== 'hero' || e.isPlayer);
  g.nextWave = Infinity;
  return g;
};

test('full map keeps equal world axes and the entire structure roster', () => {
  const g = new Game();
  assert.equal(WORLD.width, WORLD.height);
  assert.ok(WORLD.width > 16000);
  assert.equal(g.entities.filter(e=>e.kind==='tower').length,22);
  assert.equal(g.entities.filter(e=>e.kind==='barracks').length,12);
  assert.equal(g.entities.filter(e=>e.kind==='fountain').length,2);
  assert.equal(g.camps.length,28);
  assert.ok(Math.hypot(BASES[1].x-BASES[0].x,BASES[1].y-BASES[0].y)>15000);
});

test('three lane towers protect barracks and both T4 towers protect the Ancient', () => {
  const g=quiet(), p=g.player;
  const tower=tier=>g.entities.find(e=>e.kind==='tower'&&e.team===1&&e.lane===1&&e.tier===tier);
  const barracks=g.entities.find(e=>e.kind==='barracks'&&e.team===1&&e.lane===1);
  const t4=g.entities.filter(e=>e.kind==='tower'&&e.team===1&&e.tier===4);
  const ancient=g.entities.find(e=>e.kind==='ancient'&&e.team===1);
  assert.equal(g.isProtected(tower(2)),true);
  assert.equal(g.isProtected(tower(3)),true);
  assert.equal(g.isProtected(barracks),true);
  assert.equal(g.isProtected(t4[0]),true);
  for(let tier=1;tier<=3;tier++){
    assert.equal(g.isProtected(tower(tier)),false);
    g.damage(tower(tier),1e7,p,'pure');
    assert.equal(tower(tier).dead,true);
  }
  assert.equal(g.isProtected(barracks),false);
  assert.equal(g.isProtected(t4[0]),false);
  assert.equal(g.isProtected(ancient),true);
  g.damage(t4[0],1e7,p,'pure');
  assert.equal(g.isProtected(ancient),true);
  g.damage(t4[1],1e7,p,'pure');
  assert.equal(g.isProtected(ancient),false);
  g.damage(ancient,1e7,p,'pure');
  assert.equal(g.status,'won');
});

test('barracks upgrade the opposing lane and mega creeps require every barracks', () => {
  const g=quiet();
  const melee=g.entities.find(e=>e.kind==='barracks'&&e.team===1&&e.lane===1&&e.barracksType==='melee');
  assert.equal(g.creepUpgrade(0,1,'melee'),'normal');
  melee.dead=true; melee.hp=0;
  assert.equal(g.creepUpgrade(0,1,'melee'),'super');
  assert.equal(g.creepUpgrade(0,1,'ranged'),'normal');
  assert.equal(g.creepUpgrade(0,0,'melee'),'normal');
  for(const b of g.entities.filter(e=>e.kind==='barracks'&&e.team===1)){b.dead=true;b.hp=0;}
  assert.equal(g.creepUpgrade(0,2,'ranged'),'mega');
});

test('neutral camps spawn on the minute, with bodies blocking respawn and space allowing it', () => {
  const g=quiet();
  advance(g,59.9);
  assert.equal(g.entities.filter(e=>e.kind==='neutral'&&!e.isRoshan&&!e.dead).length,0);
  advance(g,.2);
  const camp=g.camps[0];
  const pack=()=>g.entities.filter(e=>e.kind==='neutral'&&e.campId===camp.id&&!e.dead);
  assert.ok(pack().length>=2);
  const first=pack().map(e=>e.id);
  advance(g,60);
  assert.deepEqual(pack().map(e=>e.id),first);
  for(const u of pack())g.damage(u,1e7,g.player,'pure');
  Object.assign(g.player,{x:camp.x,y:camp.y});
  advance(g,60);
  assert.equal(pack().length,0);
  Object.assign(g.player,BASES[0]);
  advance(g,60);
  assert.ok(pack().length>=2);
  assert.ok(pack().every(e=>e.team===2&&e.xpBounty>0&&e.goldMax>=e.goldMin));
});

test('neutral combat rewards the last hitter, shares experience, and never scores a hero kill', () => {
  const g=quiet(); advance(g,60.05);
  const n=g.entities.find(e=>e.kind==='neutral'&&!e.isRoshan),p=g.player;
  Object.assign(p,{x:n.x+120,y:n.y});
  const gold=p.gold,xp=p.xp,hits=p.lastHits;
  g.damage(n,1e7,p,'pure');
  assert.ok(p.gold>=gold+n.goldMin);
  assert.ok(p.xp>xp);
  assert.equal(p.lastHits,hits+1);
  assert.deepEqual(g.score,[0,0]);
});

test('selecting enemies and neutrals is independent of hero control and purchases', () => {
  const g=new Game();
  const enemy=g.entities.find(e=>e.kind==='hero'&&e.team===1);
  const before=enemy.inventory.slice();
  g.selectEntity(enemy.id);
  assert.equal(g.selected.id,enemy.id);
  assert.equal(g.player.destination,null);
  assert.equal(g.buy('boots').ok,true);
  assert.deepEqual(enemy.inventory,before);
  assert.ok(g.player.inventory.includes('boots'));
  g.selectEntity(g.player.id);
  assert.equal(g.selected.id,g.player.id);
});

test('backdoor reduces damage and repairs it until lane creeps disable the protection',()=>{
  const g=quiet(),p=g.player;
  const outer=g.entities.find(e=>e.kind==='tower'&&e.team===1&&e.lane===1&&e.tier===1);
  const inner=g.entities.find(e=>e.kind==='tower'&&e.team===1&&e.lane===1&&e.tier===2);
  g.damage(outer,1e7,p,'pure');g.step(.05);
  const before=inner.hp;g.damage(inner,100,p,'pure');
  assert.equal(before-inner.hp,50);g.step(1);assert.equal(inner.hp,before);
  const c=g._unit('creep',0,inner.x+500,inner.y,{maxHp:5000,speed:0,damage:0,range:0,lane:1,buffs:{}});g.entities.push(c);
  g._updateBackdoor();assert.equal(inner.backdoorActive,false);
  const hp=inner.hp;g.damage(inner,100,p,'pure');assert.equal(hp-inner.hp,100);
  c.dead=true;g.step(14);assert.equal(inner.backdoorActive,false);
  g.step(1.5);assert.equal(inner.backdoorActive,true);
});
