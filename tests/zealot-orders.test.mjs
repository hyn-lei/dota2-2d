import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {ownedUnits} from '../src/controlled-units.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function setup(){
 const g=new Game({hero:'chen'}),p=g.player,z=ownedUnits(g,p).find(e=>e.zealot);g.entities=[p,z];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 Object.assign(p,{x:10000,y:11000,attackCooldown:Infinity});Object.assign(z,{x:10080,y:11000});g._index();return {g,p,z};
}
function enemy(g,x,y){const e=g._unit('creep',1,x,y,{lane:1,name:'目标',maxHp:10000,hpRegen:0,speed:0,range:0,armor:0,magicResistance:0,attackCooldown:Infinity});g.entities.push(e);return e;}
test('an untouched Zealot follows Chen without taking nearby enemies as an automatic order',()=>{
 const {g,p,z}=setup();const e=enemy(g,z.x+80,z.y);p.x-=350;const before=distance(z,p);g.step(.5);
 assert.equal(z.creatureOrder,'follow');assert.ok(distance(z,p)<before-100);assert.equal(z.targetId,null);assert.equal(e.hp,10000);
});
test('an empty-ground order can move beyond 600 from Chen and stays there without automatic target acquisition',()=>{
 const {g,p,z}=setup(),point=g.navigation.nearestWalkable({x:11200,y:11000});g.unitCommand(z.id,'moveTo',[point.x,point.y]);g.step(8);
 assert.ok(distance(z,p)>600);assert.ok(distance(z,point)<4);assert.equal(z.creatureOrder,'hold');
 const position={x:z.x,y:z.y},e=enemy(g,z.x+80,z.y);g.unitCommand(z.id,'setMovement',[0,0]);g.step(2);
 assert.equal(z.targetId,null);assert.equal(e.hp,10000);assert.ok(distance(z,position)<.01);
});
test('a directed enemy is pursued outside 600, ahead of closer enemies; its death starts a 600-radius hunt',()=>{
 const {g,p,z}=setup(),selected=enemy(g,11200,11000),nearby=enemy(g,10200,11100);g.unitCommand(z.id,'attackTarget',[selected.id]);const before=distance(z,selected);g.step(.5);
 assert.equal(z.targetId,selected.id);assert.equal(z.creatureOrder,'attack');assert.ok(distance(z,selected)<before-100);assert.equal(nearby.hp,10000);
 g._kill(selected,z);g.step(.05);assert.equal(z.creatureOrder,'hunt');assert.equal(z.targetId,nearby.id);assert.equal(z.huntTargetId,nearby.id);
 g._kill(nearby,z);p.x=9800;const d=distance(z,p);g.step(.3);assert.equal(z.creatureOrder,'follow');assert.equal(z.targetId,null);assert.ok(distance(z,p)<d);
});
test('a manual empty-ground order cancels a running hunt, while a subsequent enemy order enables hunting again',()=>{
 const {g,z}=setup(),a=enemy(g,10200,11000),b=enemy(g,10300,11100);g.unitCommand(z.id,'attackTarget',[a.id]);g._kill(a,z);g.step(.05);assert.equal(z.targetId,b.id);
 const point=g.navigation.nearestWalkable({x:10000,y:11300});g.unitCommand(z.id,'moveTo',[point.x,point.y]);g.step(1.5);assert.equal(z.creatureOrder,'hold');assert.equal(z.targetId,null);assert.equal(b.hp,10000);
 g.unitCommand(z.id,'attackTarget',[b.id]);g._kill(b,z);const c=enemy(g,z.x+550,z.y);g.step(.05);assert.equal(z.creatureOrder,'hunt');assert.equal(z.targetId,c.id);
});
test('automatic acquisition measures 600 from the Zealot, keeps an acquired target through chase, and ignores enemies beyond 600',()=>{
 const {g,z}=setup(),a=enemy(g,z.x+80,z.y);g.unitCommand(z.id,'attackTarget',[a.id]);g._kill(a,z);const b=enemy(g,z.x+601,z.y);g.step(.05);assert.equal(z.creatureOrder,'follow');assert.equal(z.targetId,null);
 g.unitCommand(z.id,'attackTarget',[b.id]);g._kill(b,z);const c=enemy(g,z.x+590,z.y);g.step(.05);assert.equal(z.huntTargetId,c.id);c.x+=700;g.step(.1);assert.equal(z.targetId,c.id);
});
test('stop and keyboard movement park the Zealot, and saved parked orders retain their behavior',()=>{
 const {g,p,z}=setup();g.unitCommand(z.id,'setMovement',[1,0]);g.step(.4);g.unitCommand(z.id,'setMovement',[0,0]);g.unitCommand(z.id,'stop',[]);assert.equal(z.creatureOrder,'hold');
 const restored=restoreMatch(parseMatch(serializeMatch(g)));restored.paused=false;const copy=restored.entities.find(e=>e.id===z.id),point={x:copy.x,y:copy.y};enemy(restored,copy.x+80,copy.y);restored.step(1);
 assert.equal(copy.creatureOrder,'hold');assert.equal(copy.targetId,null);assert.ok(distance(copy,point)<.01);assert.equal(restored.player.id,p.id);
});
