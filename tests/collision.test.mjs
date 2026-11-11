import test from 'node:test';
import assert from 'node:assert/strict';
import {CollisionWorld,collisionShape,phased} from '../src/collision.js';
import {Game} from '../src/engine.js';
import {Navigator} from '../src/navigation.js';
import {createMeta} from '../src/inventory.js';
const unit=(id,kind,x,y,fields={})=>({id,kind,x,y,radius:24,hp:100,dead:false,statuses:{},...fields});
const openNav=()=>new Navigator({cols:100,rows:100,cellSize:64,blocked:'0'.repeat(10000)},[]);
test('all ground unit types body-block allies and enemies, with continuous collision preventing tunnelling',()=>{
 for(const kind of ['hero','creep','neutral','summon','illusion','courier','ward'])for(const team of [0,1]){
  const mover=unit('a','hero',300,300,{team:0}),blocker=unit('b',kind,450,300,{team}),world=new CollisionWorld();world.rebuild([mover,blocker],0);
  assert.equal(world.move(mover,1000,0).blocked,true,kind);assert.ok(mover.x<=402.001,kind);assert.ok(Math.hypot(mover.x-blocker.x,mover.y-blocker.y)>=48-.001);
 }
});
test('structure footprints block movement and death releases them; selection rings do not control collision',()=>{
 for(const kind of ['tower','barracks','ancient','fountain','filler']){
  const mover=unit('a','hero',300,300),blocker=unit('b',kind,500,300,{bounds:[100,160],selectionRadius:1000}),world=new CollisionWorld();world.rebuild([mover,blocker],0);
  assert.deepEqual(collisionShape(blocker),{type:'box',hx:50,hy:80});world.move(mover,500,0);assert.ok(mover.x<=426.001,kind);
  blocker.dead=true;assert.equal(world.move(mover,500,0).blocked,false);assert.ok(mover.x>blocker.x);
 }
});
test('phase passes through units but preserves buildings; delayed and expired phases do not bypass collision',()=>{
 const mover=unit('a','hero',300,300),creep=unit('b','creep',450,300),tower=unit('c','tower',650,300,{bounds:[80,80]}),world=new CollisionWorld();
 mover.statuses.phase={phased:true,startedAt:2,until:5};assert.equal(phased(mover,1),false);assert.equal(phased(mover,3),true);assert.equal(phased(mover,5),false);
 world.rebuild([mover,creep,tower],3);world.move(mover,500,0);assert.ok(mover.x>450);assert.ok(mover.x<=586.001);
 mover.x=300;world.rebuild([mover,creep,tower],5);world.move(mover,500,0);assert.ok(mover.x<=402.001);
});
test('moving collision index follows units across cells, overlap recovery permits escape, and contact slides',()=>{
 const a=unit('a','hero',300,300),b=unit('b','creep',300,300),world=new CollisionWorld();world.rebuild([a,b],0);world.move(a,100,0);assert.ok(a.x>b.x+48);
 b.x=650;world.update(b);a.x=500;a.y=280;world.update(a);world.move(a,200,80);assert.ok(a.y>280);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=48-.001);
});
test('overlap recovery finds another reachable direction when the shortest push is blocked by terrain',()=>{
 const terrain=Array(20*20).fill('0');for(let y=0;y<20;y++)terrain[y*20+11]='1';
 const nav=new Navigator({cols:20,rows:20,cellSize:32,blocked:terrain.join('')},[]);
 const a=unit('a','hero',320,320),b=unit('b','hero',320,320),world=new CollisionWorld();world.rebuild([a,b],0);
 world.separate(a,nav);
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=48-.001);
 assert.equal(nav.lineClear({x:320,y:320},a),true,'recovery must stay on this side of the terrain wall');
 assert.deepEqual({x:b.x,y:b.y},{x:320,y:320},'the idle blocker should keep its position');
});
test('engine moves around a blocking unit without overlap, and phase boots expire in actual gameplay',()=>{
 const g=new Game(),p=g.player;g.entities=[p];g.navigation=openNav();g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 Object.assign(p,{x:1000,y:1000});const blocker=g._unit('creep',0,1180,1000,{radius:16,speed:0,maxHp:10000});g.entities.push(blocker);g._creepTick=()=>{};g.moveTo(1450,1000);
 for(let i=0;i<160;i++){g.step(.05);assert.ok(Math.hypot(p.x-blocker.x,p.y-blocker.y)>=40-.01);}
 assert.ok(p.x>blocker.x+100,`unit did not navigate past blocker: ${p.x},${p.y}`);
 Object.assign(p,{x:1000,y:1000,destination:null,navPath:null});p.inventory=['phase_boots'];p.inventoryMeta=[createMeta(p,'phase_boots')];g._refreshHero(p);g._index();assert.equal(g.useItem(0,p).ok,true);assert.equal(phased(p,g.time),true);
 g._move(p,{x:1450,y:1000},1);assert.ok(p.x>blocker.x);g.step(4);assert.equal(phased(p,g.time),false);
});
