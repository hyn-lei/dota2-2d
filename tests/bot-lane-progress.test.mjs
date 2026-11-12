import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {CoopGame} from '../server/coop-game.mjs';
import {HEROES} from '../src/data.js';
import {TEAM_LANES} from '../src/map-data.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function forwardDistance(h,from,to){
 const dx=to.x-from.x,dy=to.y-from.y;
 return ((h.x-from.x)*dx+(h.y-from.y)*dy)/Math.hypot(dx,dy);
}
function assertOpeningProgress(g){
 const humans=g.entities.filter(h=>h.kind==='hero'&&(h.isPlayer||h.isHuman));
 const starts=humans.map(h=>({h,point:{x:h.x,y:h.y}}));
 const bots=g.entities.filter(h=>h.kind==='hero'&&!h.isPlayer&&!h.isHuman);
 const routes=bots.map(h=>({h,path:TEAM_LANES[h.team][h.lane],furthest:-Infinity}));
 for(let frame=0;frame<500;frame++){
  g.step(.05);
  for(const route of routes)route.furthest=Math.max(route.furthest,forwardDistance(route.h,route.path[1],route.path[2]));
 }
 for(const {h,point} of starts)assert.equal(distance(h,point),0,'idle humans should remain at their spawn');
 for(const {h,furthest} of routes)assert.ok(furthest>600,`${h.team}/${h.heroId} stayed near T3: forward progress ${furthest}`);
}

for(const difficulty of ['easy','normal','hard','nightmare'])test(`${difficulty}: all nine bots advance beyond the opening T3 waypoints`,()=>{
 assertOpeningProgress(new Game({difficulty,seed:42}));
});

for(const count of [1,4])test(`${count}-human cooperative rooms advance both teams beyond their opening T3 waypoints`,()=>{
 const roster=Object.keys(HEROES).slice(0,count).map((heroId,i)=>({heroId,clientId:`human-${i}`,name:`Human ${i}`}));
 assertOpeningProgress(new CoopGame(roster,{fillWithAI:true,seed:42}));
});

function laneArena(team,state){
 const g=new Game({seed:42}),h=g.entities.find(e=>e.kind==='hero'&&e.team===team&&!e.isPlayer&&e.lane===1);
 g.entities=g.entities.filter(e=>e===g.player||e===h||['tower','barracks','ancient','fountain','filler'].includes(e.kind));
 g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 const path=TEAM_LANES[team][1];
 Object.assign(h,path[2],{pathIndex:8,navPath:null,aiTimer:0,botState:{targetId:null,nextMacroAt:0,goal:null,...state},botShop:{nextAt:Infinity,needsShop:false}});
 g._index();return {g,h,path};
}

for(const team of [0,1])for(const [reason,state] of [
 ['legacy push state',{mode:'push'}],
 ['lane switch',{mode:'push',lane:0}],
 ['completed defense',{mode:'defend',lane:1,objectiveKey:'defend:gone'}],
 ['completed push task',{mode:'push',lane:1,objectiveKey:'push:gone'}]
])test(`team ${team} rejoins its lane after ${reason} and keeps advancing`,()=>{
 const {g,h,path}=laneArena(team,state);g.step(5);
 assert.ok(forwardDistance(h,path[2],path[3])>600,`${reason} returned toward a passed lane waypoint`);
});

test('saving and restoring an advancing bot preserves continued forward movement',()=>{
 const {g,h,path}=laneArena(0,{mode:'push'});g.step(3);
 const before=forwardDistance(h,path[2],path[3]);
 const resumed=restoreMatch(parseMatch(serializeMatch(g,0)));resumed.setPaused(false);resumed.step(4);
 const restored=resumed.entities.find(e=>e.id===h.id);
 assert.ok(forwardDistance(restored,path[2],path[3])-before>600,'restored bot folded back to a passed waypoint');
});

test('Aegis respawn rejoins the nearby lane instead of retaining a base waypoint',()=>{
 const {g,h,path}=laneArena(0,{mode:'push',lane:1});h.aegisUntil=300;
 g._kill(h,null);g.step(10);
 assert.equal(h.dead,false);
 assert.ok(forwardDistance(h,path[2],path[3])>600,'reincarnated bot returned toward its base');
});
