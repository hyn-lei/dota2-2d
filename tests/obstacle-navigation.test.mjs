import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {Navigator} from '../src/navigation.js';

function arena(kind='creep',team=0){
 const g=new Game();g.entities=[];
 g.navigation=new Navigator({cols:100,rows:100,cellSize:32,blocked:'0'.repeat(10000)},[]);
 const mover=kind==='hero'?g._makeHero('axe',team,1,false,0):g._unit('creep',team,1000,1000,{radius:16,speed:200,maxHp:10000});
 Object.assign(mover,{x:1000,y:1000,navPath:null});if(kind!=='hero')g.entities.push(mover);
 const blockers=[[1064,1000],[1064,960],[1064,1040],[1000,952],[1032,952],[1000,1048],[1032,1048]].map(([x,y])=>g._unit('creep',team,x,y,{radius:16,speed:0,maxHp:10000}));
 g.entities.push(...blockers);g._index();return {g,mover,blockers};
}
function advance(g,mover,goal,seconds,blockers){
 for(let i=0;i<seconds/.05;i++){
  g.time+=.05;g._index();const before={x:mover.x,y:mover.y};g._move(mover,goal,.05);
  assert.ok(Math.hypot(mover.x-before.x,mover.y-before.y)<=g.combatStats(mover).speed*.05+.01,'rerouting must walk rather than teleport');
  for(const b of blockers)if(!b.dead)assert.ok(Math.hypot(mover.x-b.x,mover.y-b.y)>=mover.collisionRadius+b.collisionRadius-.001,'rerouting must preserve body blocking');
 }
}
for(const kind of ['creep','hero'])for(const team of [0,1])test(`${kind} team ${team} checks a three-unit front blockage and backs out to a clear route`,()=>{
 const {g,mover,blockers}=arena(kind,team),goal={x:1450,y:1000};
 advance(g,mover,goal,.05,blockers);assert.ok(mover.x<1000,'front detection should select the open route behind the side blockers before contact');
 advance(g,mover,goal,8,blockers);assert.ok(Math.hypot(mover.x-goal.x,mover.y-goal.y)<10,`stuck at ${mover.x},${mover.y}`);
});
test('AI reroutes around a tower footprint and nearby creeps without changing its destination',()=>{
 const {g,mover,blockers}=arena('hero'),tower=g._unit('tower',0,1230,1000,{bounds:[120,160],radius:80,maxHp:10000});
 g.entities.push(tower);g.navigation.updateBuildings([tower]);g._index();const goal={x:1700,y:1000};
 for(let i=0;i<220;i++){
  advance(g,mover,goal,.05,blockers);
  assert.ok(Math.abs(mover.x-tower.x)>=60+mover.collisionRadius-.001||Math.abs(mover.y-tower.y)>=80+mover.collisionRadius-.001);
 }
 assert.ok(Math.hypot(mover.x-goal.x,mover.y-goal.y)<10);assert.deepEqual(mover.navGoal,goal);
});
test('an impassable unit wall waits without crossing bodies and retries when the blockers die',()=>{
 const {g,mover,blockers:sideBlockers}=arena(),terrain=Array(10000).fill('0');
 for(const y of [27,36])for(let x=0;x<100;x++)terrain[y*100+x]='1';
 g.navigation=new Navigator({cols:100,rows:100,cellSize:32,blocked:terrain.join('')},[]);
 const blockers=[...sideBlockers,...Array.from({length:8},(_,i)=>g._unit('creep',0,1100,896+i*32,{radius:16,speed:0,maxHp:10000}))];
 g.entities=[mover,...blockers];g._index();const goal={x:1450,y:1000};
 let queries=0;const route=g._routeObstacle.bind(g);g._routeObstacle=(...args)=>{queries++;return route(...args);};
 advance(g,mover,goal,3,blockers);assert.ok(mover.x<1100);assert.ok(queries>=5&&queries<=12,`continuous blocking must keep checking without flooding searches: ${queries}`);
 for(const b of blockers){b.dead=true;b.hp=0;}g._index();
 advance(g,mover,goal,5,blockers);assert.ok(Math.hypot(mover.x-goal.x,mover.y-goal.y)<10,'death should reopen the route');
});
