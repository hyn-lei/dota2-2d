import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {CoopGame} from '../server/coop-game.mjs';
import {BASES,HEROES} from '../src/data.js';
import {collisionShape} from '../src/collision.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const heroes=g=>g.entities.filter(e=>e.kind==='hero');
function assertClearSpawn(g,h){
  assert.ok(g.navigation.isWalkable(h),`${h.id} spawned in blocked terrain`);
  for(const f of g.entities.filter(e=>e.kind==='fountain'))assert.ok(distance(h,f)>=Math.max(200,f.radius)+h.collisionRadius,`${h.id} spawned inside the visible fountain circle`);
  for(const other of g.entities){
    if(other===h||other.dead||other.hp<=0||other.flying||other.noCollision)continue;
    const shape=collisionShape(other),radius=h.collisionRadius;
    if(shape.type==='circle')assert.ok(distance(h,other)>=radius+shape.radius-.001,`${h.id} overlaps ${other.id}`);
    else assert.ok(Math.abs(h.x-other.x)>=shape.hx+radius-.001||Math.abs(h.y-other.y)>=shape.hy+radius-.001,`${h.id} overlaps ${other.id}`);
  }
}

test('every hero selection starts both teams on walkable, unoccupied ground',()=>{
  for(const hero of Object.keys(HEROES)){
    const g=new Game({hero});
    for(const h of heroes(g)){
      assertClearSpawn(g,h);
      assert.ok(distance(h,BASES[h.team])<600,'opening spawn should remain inside its fountain area');
    }
  }
});

test('cooperative humans and AI fill reserve separate spawn positions for every room size',()=>{
  const ids=Object.keys(HEROES);
  for(let count=1;count<=5;count++){
    const roster=ids.slice(0,count).map((heroId,i)=>({heroId,clientId:`human-${i}`,name:`Human ${i}`}));
    const g=new CoopGame(roster,{fillWithAI:true});
    assert.equal(heroes(g).filter(h=>h.isHuman).length,count);
    for(const h of heroes(g))assertClearSpawn(g,h);
  }
});

test('all nine opening bots leave the fountain while the player stays idle, at every difficulty',()=>{
  for(const difficulty of ['easy','normal','hard','nightmare']){
    const g=new Game({difficulty}),bots=heroes(g).filter(h=>!h.isPlayer);
    const starts=new Map(bots.map(h=>[h.id,{x:h.x,y:h.y}])),playerStart={x:g.player.x,y:g.player.y};
    g.step(5);
    assert.equal(distance(g.player,playerStart),0,'idle player should stay at the reserved spawn');
    for(const h of bots)assert.ok(distance(h,starts.get(h.id))>700,`${difficulty} ${h.id} remained stuck at spawn`);
  }
});

test('simultaneous hero respawns reserve free positions before the next movement tick',()=>{
  const g=new Game(),roster=heroes(g);
  for(const h of roster){g._kill(h,null);h.respawnTimer=.01;}
  g.step(.05);
  for(const h of roster){
    assert.equal(h.dead,false);
    assertClearSpawn(g,h);
    assert.ok(distance(h,BASES[h.team])<600);
  }
  const starts=new Map(roster.map(h=>[h.id,{x:h.x,y:h.y}]));
  g.step(5);
  for(const h of roster.filter(h=>!h.isPlayer))assert.ok(distance(h,starts.get(h.id))>700,`${h.id} remained stuck after respawn`);
});

test('bots recover legacy stacked fountain positions without needing a teleport scroll',()=>{
  const g=new Game(),bots=heroes(g).filter(h=>!h.isPlayer);
  for(const h of heroes(g)){
    Object.assign(h,BASES[h.team],{navPath:null,navRetryAt:999,aiTimer:0,tp:[],tpMeta:[]});
  }
  g._index();g.step(5);
  for(const h of bots)assert.ok(distance(h,BASES[h.team])>700,`${h.id} could not recover its invalid spawn`);
});
