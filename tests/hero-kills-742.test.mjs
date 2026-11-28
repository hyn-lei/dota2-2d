import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {addStatus,applyStun} from '../src/hero-runtime.js';
import {heal} from '../src/item-common.js';

test('hero rewards split among nearby heroes and recent remote contributors with owned-unit credit',()=>{
 const g=new Game(),killer=g.player;
 const make=(id,team,index)=>g._makeHero(id,team,1,false,index);
 const victim=make('axe',1,0),assistant=make('chen',0,1),expired=make('windranger',0,2),nearby=make('drow_ranger',0,3);
 Object.assign(victim,{x:10000,y:10000,gold:3000,killStreak:4});
 Object.assign(killer,{x:8000,y:10000,gold:750});
 Object.assign(assistant,{x:8500,y:8000,gold:750});
 Object.assign(nearby,{x:10100,y:10000,gold:750});
 Object.assign(expired,{x:8000,y:8000,gold:750});
 const summon=g._unit('summon',0,9900,10000,{ownerId:assistant.id});
 for(const hero of [killer,victim,assistant,expired,nearby])hero.tp=[];
 g.entities=[killer,victim,assistant,expired,nearby,summon];
 g.damage(victim,10,expired,'pure');
 g.time=21;g.damage(victim,10,summon,'pure');assistant.dead=true;assistant.hp=0;
 g.time=22;g.damage(victim,victim.hp,killer,'pure');
 assert.deepEqual([killer,assistant,expired,nearby].map(h=>h.gold-750),[413,68,0,68]);
 assert.deepEqual([killer.kills,assistant.assists,expired.assists,nearby.assists],[1,1,0,0]);
 assert.deepEqual([killer.xp,assistant.xp,nearby.xp],[50,0,50]);
 assert.equal(victim.killStreak,0);
});

test('a hero who recently controlled the victim is credited when the victim dies to a tower',()=>{
 const g=new Game(),hero=g.player,guard=g.entities.find(e=>e.kind==='tower'&&e.team===hero.team);
 const victim=g._makeHero('axe',1,0,false,0);
 Object.assign(hero,{x:1000,y:1000,gold:600});
 Object.assign(victim,{x:10000,y:10000,gold:600});
 hero.tp=[];victim.tp=[];
 g.entities=[hero,victim,guard];
 applyStun(g,victim,1,hero);
 g.time=12;g.damage(victim,victim.hp,guard,'pure');
 assert.equal(hero.kills,1);
 assert.equal(hero.gold-600,332);
 assert.equal(hero.xp,100);
});

test('an attack dealing zero damage does not award a distant assist',()=>{
 const g=new Game(),killer=g.player;
 const victim=g._makeHero('axe',1,0,false,0),distant=g._makeHero('chen',0,1,false,1);
 Object.assign(killer,{x:10000,y:10000,gold:600});
 Object.assign(victim,{x:10100,y:10000,gold:600});
 Object.assign(distant,{x:8000,y:10000,gold:600});
 g.entities=[killer,victim,distant];
 addStatus(g,victim,'invulnerable',{positive:true,invulnerable:true,duration:2});
 assert.equal(g.damage(victim,100,distant,'pure'),0);
 g.time=4;
 g.damage(victim,victim.hp,killer,'pure');
 assert.equal(victim.dead,true);
 assert.equal(distant.assists,0);
 assert.equal(distant.gold,600);
});

test('a remote healer who restores the killer health is credited on the kill',()=>{
 const g=new Game(),killer=g.player;
 const victim=g._makeHero('axe',1,0,false,0),healer=g._makeHero('chen',0,1,false,1);
 Object.assign(killer,{x:10000,y:10000,hp:300});
 Object.assign(victim,{x:10100,y:10000});
 Object.assign(healer,{x:8000,y:10000});
 g.entities=[killer,victim,healer];
 assert.equal(heal(g,killer,200,healer),200);
 g.damage(victim,victim.hp,killer,'pure');
 assert.equal(healer.assists,1);
});

test('experience past level thirty does not inflate a hero kill reward',()=>{
 const reward=overflow=>{
  const g=new Game(),killer=g.player,victim=g._makeHero('axe',1,0,false,0);
  Object.assign(victim,{level:30,xp:overflow});
  g.entities=[killer,victim];
  g.damage(victim,victim.hp,killer,'pure');
  return [killer.level,killer.xp];
 };
 assert.deepEqual(reward(10000),reward(0));
});
