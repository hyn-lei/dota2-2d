import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {HEROES} from '../src/data.js';
import {NEUTRAL_UNITS} from '../src/unit-data.js';
import {castCreature} from '../src/neutral-runtime.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';

function arena(hero,difficulty='normal'){
 const g=new Game({hero,difficulty}),p=g.player;
 Object.assign(p,{x:10400,y:10400,attackCooldown:999});
 const wildkin=g._unit('neutral',1,10200,10400,{...NEUTRAL_UNITS.enraged_wildkin,abilities:['enraged_wildkin_hurricane'],mana:100,maxMana:100,manaRegen:0,speed:0,attackCooldown:999});
 wildkin.home=wildkin.campCenter={x:wildkin.x,y:wildkin.y};wildkin.campId='hurricane-test';
 g.entities=[p,wildkin];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g._index();
 return {g,p,wildkin};
}

test('Wildkin Hurricane pushes every playable hero and subsequent game ticks keep advancing',()=>{
 for(const hero of Object.keys(HEROES))for(const difficulty of ['normal','hard']){
  const {g,p,wildkin}=arena(hero,difficulty);
  assert.equal(castCreature(g,wildkin,0,{...p,direction:{x:1,y:0}}).ok,true,hero);
  g.step(.2);assert.ok(Math.abs(p.x-10600)<1e-6,hero+' moves halfway through the push');
  g.step(.21);assert.ok(Math.abs(p.x-10800)<1e-6,hero+' finishes the push');assert.equal(p.forcedMotion,null);
  g.setMovement(0,1);g.step(.2);assert.ok(p.y>10400,hero+' can move after the push');assert.ok(g.time>=.6-1e-7);
 }
});

test('Resuming an in-progress legacy Hurricane push preserves its remaining distance and duration',()=>{
 const {g,p,wildkin}=arena('weaver');wildkin.mana=0;g.time=.1;p.x=10500;
 p.forcedMotion={kind:'push',dx:1,dy:0,distance:400,traveled:100,startedAt:0,until:.4};
 const restored=restoreMatch(parseMatch(serializeMatch(g,0)));restored.setPaused(false);
 restored.step(.1);assert.ok(Math.abs(restored.player.x-10600)<1e-6);
 restored.step(.21);assert.equal(restored.player.x,10800);assert.equal(restored.player.forcedMotion,null);
});

test('Legacy saved Hurricane pushes finish and the resumed match remains playable',()=>{
 const {g,p,wildkin}=arena('weaver');wildkin.mana=0;
 p.forcedMotion={kind:'push',dx:1,dy:0,distance:400,traveled:100,startedAt:0,until:.4};
 p.x=10500;g.time=8;
 const restored=restoreMatch(parseMatch(serializeMatch(g,0)));restored.setPaused(false);
 restored.step(.05);assert.equal(restored.player.x,10800);assert.equal(restored.player.forcedMotion,null);
 restored.setMovement(0,1);restored.step(.2);assert.ok(restored.player.y>10400);assert.ok(restored.time>8.2);
});
