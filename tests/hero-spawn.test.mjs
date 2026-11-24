import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {CoopGame} from '../server/coop-game.mjs';
import {BASES,HEROES} from '../src/data.js';
import {collisionShape} from '../src/collision.js';
import {shopAccess} from '../src/inventory.js';

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
function assertFountainRecovery(g,h){
  const sample=structuredClone(h);Object.assign(sample,{isPlayer:true,hp:h.maxHp/2,mana:h.maxMana/2,aiTimer:Infinity,destination:null,explicitTarget:null,movementInput:{x:0,y:0},itemChannel:{type:'recovery-probe'}});
  const outside=structuredClone(sample);Object.assign(outside,{x:10400,y:10400});
  g._heroTick(sample,.1);g._heroTick(outside,.1);
  // Location-dependent innates can change max health/mana during the pulse.
  assert.ok(sample.hp/sample.maxHp>outside.hp/outside.maxHp+.001,'reserved spawn receives actual fountain healing '+JSON.stringify({hero:h.heroId,team:h.team,position:{x:h.x,y:h.y},base:BASES[h.team]}));
  assert.ok(sample.mana/sample.maxMana>outside.mana/outside.maxMana+.001,'reserved spawn receives actual fountain mana restoration');
  assert.equal(shopAccess(h).base,true,'reserved spawn retains base-shop access');
}

test('base recovery and shop access are centered on the current extracted fountain',()=>{
  const g=new Game(),fountain=g.entities.find(e=>e.kind==='fountain'&&e.team===1),h=g._makeHero('juggernaut',1,1,true,0);
  Object.assign(h,{x:fountain.x-760,y:fountain.y+760,hp:h.maxHp/2,mana:h.maxMana/2,hpRegen:0,manaRegen:0,movementInput:{x:0,y:0},destination:null});g._index();
  const hp=h.hp,mana=h.mana;g._heroTick(h,.1);
  assert.ok(h.hp>hp&&h.mana>mana,'the current fountain heals its own nearby ground');
  assert.equal(shopAccess(h).base,true);
});

test('every hero selection starts both teams on walkable, unoccupied ground',()=>{
  for(const hero of Object.keys(HEROES)){
    const g=new Game({hero});
    for(const h of heroes(g)){
      assertClearSpawn(g,h);
      assertFountainRecovery(g,h);
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
    assertFountainRecovery(g,h);
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
