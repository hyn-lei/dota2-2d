import test from 'node:test';
import assert from 'node:assert/strict';
import { Navigator } from '../src/navigation.js';
import { BASES, TEAM_LANES } from '../src/map-data.js';

test('A* goes through the opening without crossing walls or cutting corners',()=>{
  const rows=['0000000','0001000','0001000','0001000','0000000'];
  const nav=new Navigator({cols:7,rows:5,cellSize:64,origin:{x:0,y:0},blocked:rows.join('')},[]);
  const start={x:64,y:128},end={x:320,y:128},path=nav.findPath(start,end);
  assert.ok(path.length>1);
  let prev=start;
  for(const p of path){assert.equal(nav.lineClear(prev,p),true);prev=p;}
  assert.ok(Math.hypot(prev.x-end.x,prev.y-end.y)<1);
});

test('the imported terrain and trees provide a route from each fountain to all lanes',()=>{
  const nav=new Navigator();
  for(let team=0;team<2;team++)for(let lane=0;lane<3;lane++){
    const start=nav.nearestWalkable(BASES[team]),end=TEAM_LANES[team][lane][1];
    const path=nav.findPath(start,end);
    assert.ok(path.length>0,`team ${team}, lane ${lane}`);
    assert.ok(Math.hypot(path.at(-1).x-end.x,path.at(-1).y-end.y)<180);
  }
});

test('living structures block navigation and destroying them opens their footprint',()=>{
  const tower={x:192,y:128,bounds:[64,64],kind:'tower',dead:false};
  const nav=new Navigator({cols:8,rows:6,cellSize:64,origin:{x:0,y:0},blocked:'0'.repeat(48)},[],[tower]);
  assert.equal(nav.isWalkable(tower),false);
  assert.equal(nav.lineClear({x:64,y:128},{x:384,y:128}),false);
  tower.dead=true;nav.updateBuildings([tower]);
  assert.equal(nav.isWalkable(tower),true);
  assert.equal(nav.lineClear({x:64,y:128},{x:384,y:128}),true);
});

test('cutting and planting trees rebuilds paths while preserving terrain and buildings',()=>{
 const grid={cols:9,rows:7,cellSize:64,blocked:'1'+'0'.repeat(62)};
 const tree={x:256,y:192},tower={x:448,y:320,radius:24,kind:'tower'};
 const nav=new Navigator(grid,[tree],[tower]);
 assert.equal(nav.isWalkable(tree),false);
 nav.updateTrees([], [tower]);assert.equal(nav.isWalkable(tree),true);
 assert.equal(nav.isWalkable({x:0,y:0}),false);assert.equal(nav.isWalkable(tower),false);
 nav.updateTrees([tree],[tower]);assert.equal(nav.isWalkable(tree),false);
});
