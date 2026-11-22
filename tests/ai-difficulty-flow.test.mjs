import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
import {CoopGame} from '../server/coop-game.mjs';

test('A fifth-tier single player match resumes its selected difficulty and existing hero progress',()=>{
 const game=new Game({hero:'weaver',difficulty:'hell'});game.player.gold=3217;game.time=32;
 const resumed=restoreMatch(parseMatch(serializeMatch(game)));
 assert.equal(resumed.difficulty,'hell');assert.equal(resumed.player.heroId,'weaver');assert.equal(resumed.player.gold,3217);
 resumed.setPaused(false);assert.doesNotThrow(()=>resumed.step(.05));assert.ok(resumed.time>32);
});

test('An invalid difficulty falls back to standard for a new match while corrupt saved difficulty remains rejected',()=>{
 for(const difficulty of ['invalid-difficulty',['hell'],{tier:5},null])assert.equal(new Game({difficulty}).difficulty,'normal');
 const game=new Game({difficulty:'invalid-difficulty'});
 const record=parseMatch(serializeMatch(game));record.state.difficulty='invalid-difficulty';assert.throws(()=>restoreMatch(record));
});

test('Single player fifth tier does not override the existing cooperative enemy difficulty',()=>{
 const g=new CoopGame([{heroId:'weaver',clientId:'human',name:'Player'}],{fillWithAI:true,difficulty:'hell'});
 assert.equal(g.difficulty,'nightmare');assert.equal(g.entities.filter(e=>e.kind==='hero').length,10);
 assert.ok(g.entities.filter(e=>e.team===0&&e.controller==='ai').every(e=>e.aiDifficulty==='hard'));
});

test('Legacy saved bots recover their original drafted lanes instead of retaining a previous mass mid rotation',()=>{
 const g=new Game({difficulty:'hard'}),bots=g.entities.filter(h=>h.kind==='hero'&&!h.isPlayer);
 const expected=new Map(bots.map(h=>[h.id,h.lane]));const record=parseMatch(serializeMatch(g));
 for(const h of record.state.entities)if(h.kind==='hero'&&!h.isPlayer){delete h.homeLane;h.lane=1;h.botState={mode:'push',lane:1,nextMacroAt:0,goal:null};}
 const resumed=restoreMatch(record);
 for(const h of resumed.entities.filter(h=>expected.has(h.id)))assert.equal(h.lane,expected.get(h.id));
 assert.equal(resumed.player.lane,g.player.lane,'the player remains in control of their own route');
});

test('A newly saved bot keeps an explicitly reassigned lane',()=>{
 const g=new Game({difficulty:'hell'}),bot=g.entities.find(h=>h.kind==='hero'&&!h.isPlayer);bot.lane=(bot.lane+1)%3;
 const resumed=restoreMatch(parseMatch(serializeMatch(g)));assert.equal(resumed.entities.find(h=>h.id===bot.id).lane,bot.lane);
});
