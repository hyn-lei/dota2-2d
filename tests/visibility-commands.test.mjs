import test from 'node:test';
import assert from 'node:assert/strict';
import {CoopGame} from '../server/coop-game.mjs';
import {executeCommand} from '../server/commands.mjs';

test('hidden heroes cannot be inspected or targeted by a known ID',()=>{
 const g=new CoopGame([{heroId:'juggernaut',name:'Player',clientId:'fog:player'}],{fillWithAI:true});
 const p=g.player,e=g._makeHero('axe',1,0,false,0);
 Object.assign(p,{x:9856,y:9792,visionDay:1800,explicitTarget:null});
 Object.assign(e,{x:9856,y:9600});
 g.entities=[p,e];g._index();g.selectEntity(p.id);
 assert.equal(g.canSee(p,e),false);
 g.selectEntity(e.id);
 assert.equal(g.selected.id,p.id);
 const command={type:'command',id:1,action:'attackTarget',args:[e.id]};
 assert.equal(executeCommand(g,p.id,command).ok,false);
 assert.equal(p.explicitTarget,null);
});
