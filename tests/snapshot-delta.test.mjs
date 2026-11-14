import test from 'node:test';
import assert from 'node:assert/strict';
import {CoopGame} from '../server/coop-game.mjs';
import {snapshotState} from '../server/snapshot.mjs';
import {snapshotDelta,applySnapshotDelta} from '../src/snapshot-delta.js';
import {encodeMessage,decodeMessage} from '../src/network-protocol.js';
const wire=value=>decodeMessage(encodeMessage(value));

test('snapshot deltas preserve additions, removals, entity order, nested effects and permanent timestamps',()=>{
 const first={time:1,status:'playing',paused:false,obsolete:true,entities:[{id:'one',hp:100,temporary:1,statuses:{buff:{until:Infinity}}},{id:'two',hp:80}],effects:[],cutTrees:[[2,Infinity]]};
 const next={time:2,status:'won',paused:true,entities:[{id:'three',hp:50},{id:'one',hp:75,statuses:{shield:{until:Infinity,charges:2}},inventory:['branch'],meta:[{purchasedAt:-Infinity}]}],effects:[{targetId:'one',until:3}],cutTrees:[[2,Infinity],[3,5]]};
 const saved=structuredClone(first),patch=snapshotDelta(first,next);
 assert.deepEqual(applySnapshotDelta(wire(first),wire(patch)),wire(next));assert.deepEqual(first,saved);
 assert.ok(patch.entities.find(e=>e.id==='one').remove.includes('temporary'));assert.deepEqual(patch.removed,['two']);
});

test('real nine-AI snapshots reconstruct every public field while substantially reducing repeated data',()=>{
 const game=new CoopGame([{heroId:'juggernaut',name:'Human',clientId:'one'}],{fillWithAI:true,seed:42});
 game.time=180;game.nextWave=210;game.nextNeutralSpawn=240;game._spawnCamps();for(let i=0;i<4;i++)game._spawnWave();
 for(let i=0;i<20;i++)game.step(.05);
 let previous=snapshotState(game),applied=wire(previous),fullBytes=0,deltaBytes=0;
 for(let i=0;i<16;i++){
  game.step(.05);game.step(.05);const current=snapshotState(game),delta=snapshotDelta(previous,current);
  applied=applySnapshotDelta(applied,wire(delta));assert.deepEqual(applied,wire(current));
  fullBytes+=Buffer.byteLength(encodeMessage(current));deltaBytes+=Buffer.byteLength(encodeMessage(delta));previous=current;
 }
 assert.equal(game.entities.filter(e=>e.kind==='hero'&&e.controller==='ai').length,9);assert.ok(deltaBytes<fullBytes*.4,{fullBytes,deltaBytes});
});

test('a delta requires its complete baseline and cannot silently drop an unknown ordered entity',()=>{
 assert.throws(()=>applySnapshotDelta(null,{values:{},remove:[],entities:[],removed:[]}));
 assert.throws(()=>applySnapshotDelta({entities:[]},{values:{},remove:[],entities:[],removed:[],order:['missing']}));
});
