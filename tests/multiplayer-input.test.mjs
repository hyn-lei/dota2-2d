import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import * as Skills from '../src/hero-runtime.js';
import { CoopGame } from '../server/coop-game.mjs';
import { executeCommand } from '../server/commands.mjs';
const ids=['juggernaut','crystal_maiden','windranger','axe','ogre_magi'];
const roster=()=>ids.map((heroId,i)=>({heroId,name:`Player ${i+1}`,clientId:`client-${i}`}));
const match=()=>new Game({humanHeroes:roster(),difficulty:'nightmare'});
test('five humans are created untrained and never run bot economy or progression',()=>{
 const g=match(),humans=g.entities.filter(e=>e.kind==='hero'&&e.team===0);
 assert.equal(humans.length,5);assert.ok(humans.every(h=>h.isHuman&&h.isPlayer&&h.controller==='human'));
 assert.ok(humans.every(h=>h.abilityLevels.every(r=>r===0)&&h.inventory.length===0));
 g.step(2);assert.ok(humans.every(h=>!h.botShop&&!h.botState&&h.inventory.length===0&&h.skillPoints===1));
 assert.equal(g.entities.filter(e=>e.kind==='hero'&&e.team===1).length,5);
});
test('invalid human rosters never silently produce allied bots',()=>{
 assert.throws(()=>new Game({humanHeroes:roster().slice(0,4)}));
 assert.throws(()=>new Game({humanHeroes:[...roster(),roster()[0]]}));
 const repeated=roster();repeated[4].heroId=repeated[0].heroId;assert.throws(()=>new Game({humanHeroes:repeated}));
});
test('each human keyboard and movement clear affects only its owner',()=>{
 const g=match(),humans=g.entities.filter(h=>h.kind==='hero'&&h.team===0),a=humans[0],b=humans[1];
 Object.assign(a,{x:10400,y:10400});Object.assign(b,{x:10600,y:10400});g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 g.controlledHeroId=a.id;g.setMovement(1,0);g.controlledHeroId=b.id;g.setMovement(0,1);g.controlledHeroId=null;
 const startA={x:a.x,y:a.y},startB={x:b.x,y:b.y};g.step(.2);
 assert.ok(a.x>startA.x);assert.ok(b.y>startB.y);assert.equal(a.y,startA.y);assert.equal(b.x,startB.x);
 g.clearMovement(a);assert.deepEqual(a.movementInput,{x:0,y:0});assert.deepEqual(b.movementInput,{x:0,y:1});
 const stopped=a.x;g.step(.2);assert.equal(a.x,stopped);assert.ok(b.y>startB.y);
});
test('taunt, X-mark return and respawn clear the affected human without clearing a teammate',()=>{
 const g=match(),humans=g.entities.filter(h=>h.kind==='hero'&&h.team===0),a=humans[0],b=humans[1];
 a.movementInput={x:1,y:0};b.movementInput={x:0,y:1};g._respawn(a);
 assert.deepEqual(a.movementInput,{x:0,y:0});assert.deepEqual(b.movementInput,{x:0,y:1});
 const k=g.entities.find(h=>h.heroId==='kunkka');k.xMark={targetId:a.id,x:a.x,y:a.y};a.movementInput={x:1,y:0};
 assert.ok(Skills.returnMark(g,k).ok);assert.deepEqual(a.movementInput,{x:0,y:0});assert.deepEqual(b.movementInput,{x:0,y:1});
  const axe=g.entities.find(h=>h.team===1&&h.heroId==='axe');
  Object.assign(a,{x:10400,y:10400,movementInput:{x:1,y:0}});Object.assign(axe,{x:10500,y:10400,abilityLevels:[1,0,0,0]});
  for(const enemy of g.entities.filter(h=>h.kind==='hero'&&h.team===1))enemy.aiTimer=Infinity;
  g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;assert.ok(g._cast(axe,0,axe).ok);g.step(.4);
  assert.deepEqual(a.movementInput,{x:0,y:0});assert.deepEqual(b.movementInput,{x:0,y:1});
});
test('a teleport item channel clears only the caster held movement',()=>{
 const g=match(),humans=g.entities.filter(h=>h.isHuman),a=humans[0],b=humans[1];
 a.movementInput={x:1,y:0};b.movementInput={x:0,y:1};g.controlledHeroId=b.id;
 assert.ok(g.recall().ok);assert.deepEqual(b.movementInput,{x:0,y:0});assert.deepEqual(a.movementInput,{x:1,y:0});
});
test('self-targeted Bloodlust resolves the authenticated Ogre even when teammates overlap',()=>{
 const g=new CoopGame(roster()),humans=g.entities.filter(h=>h.isHuman),ogre=humans.at(-1);
 for(const h of humans)Object.assign(h,{x:10400,y:10400});ogre.abilityLevels=[0,0,1,0];
 const result=executeCommand(g,ogre.id,{type:'command',id:1,action:'cast',args:[2,{x:ogre.x,y:ogre.y,self:true}]});
 assert.equal(result.ok,true);g.step(.5);assert.ok(ogre.statuses.ogreBloodlust);assert.equal(humans[0].statuses.ogreBloodlust,undefined);
});
