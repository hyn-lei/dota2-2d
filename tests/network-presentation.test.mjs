import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {NetworkGame} from '../src/network-game.js';
import {CollisionWorld} from '../src/collision.js';
import {snapshotState} from '../server/snapshot.mjs';

const source=new Game({hero:'juggernaut'}),fixture=snapshotState(source);
const hero=fixture.entities.find(e=>e.isPlayer),enemy=fixture.entities.find(e=>e.kind==='hero'&&e.team===1);
fixture.time=1;fixture.entities=[hero,enemy];
Object.assign(hero,{x:10400,y:10400,speed:300,movementInput:{x:0,y:0},destination:null});
Object.assign(enemy,{x:10700,y:10400,moving:true});
function setup({legacy=false,rttMs=300}={}){
  let now=1000,id=0;const requests=[];
  const state=structuredClone(fixture),request=(action,args)=>{
    let resolve;const pending=new Promise(r=>resolve=r);pending.commandId=++id;
    requests.push({id,action,args,resolve});return pending;
  };
  const client=new NetworkGame({state,playerId:hero.id,request,metadata:legacy?{}:{commandId:0,rttMs},clock:()=>now});
  return {client,state,requests,tick:ms=>now+=ms,snapshot:(state,commandId=0)=>client.applySnapshot(state,{...(legacy?{}:{commandId}),rttMs})};
}

test('movement appears on the next render while authoritative positions, clock and economy remain unchanged',async()=>{
  const {client,state,requests,tick}=setup(),saved=structuredClone(state);
  const pending=client.setMovement(1,0);tick(16);const view=client.renderView();
  assert.ok(view.player.x>client.player.x+1);assert.equal(view.player.y,client.player.y);
  assert.equal(client.player.x,hero.x);assert.equal(client.time,1);assert.deepEqual(state,saved);
  assert.deepEqual(client.player.inventory,state.entities[0].inventory);assert.equal(client.player.gold,state.entities[0].gold);
  client.step(10);assert.equal(client.player.x,hero.x);assert.equal(client.time,1);
  requests[0].resolve({ok:false,reason:'rejected'});assert.equal((await pending).ok,false);await Promise.resolve();
  assert.equal(client.renderView().player.x,hero.x,'a rejection rolls back only the presentation');
});

test('a new direction and stop survive a snapshot confirming only the older held input',()=>{
  const {client,state,tick,snapshot}=setup();client.setMovement(1,0);tick(50);const right=client.renderView().player.x;
  client.setMovement(-1,0);tick(16);assert.ok(client.renderView().player.x<right);
  client.setMovement(0,0);tick(50);
  const next=structuredClone(state);next.time=1.1;next.entities[0].x+=30;next.entities[0].movementInput={x:1,y:0};snapshot(next,1);
  assert.equal(client.player.movementInput.x,1);
  assert.equal(client.presentation.predictors.get(hero.id).unit.movementInput.x,0);
  assert.equal(client.renderView().player.moving,false);tick(200);
  assert.equal(client.renderView().player.moving,false);
});

test('delayed movement confirmations converge without pulling a held direction backwards',()=>{
  for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1],[Math.SQRT1_2,Math.SQRT1_2]]){
    const {client,state,tick,snapshot}=setup();client.setMovement(x,y);tick(100);
    let previous=client.renderView().player,initialError;
    for(let n=0;n<6;n++){
      const next=structuredClone(state);next.time=1.1+n*.1;
      Object.assign(next.entities[0],{x:hero.x+(-80+n*30)*x,y:hero.y+(-80+n*30)*y,movementInput:{x,y}});
      snapshot(next,1);const saved=structuredClone(next);
      const predictor=client.presentation.predictors.get(hero.id);
      initialError??=Math.hypot(predictor.offset.x,predictor.offset.y);
      for(let frame=0;frame<5;frame++){
        tick(20);const shown=client.renderView().player;
        assert.ok((shown.x-previous.x)*x+(shown.y-previous.y)*y>0,'correction must preserve progress along the held input');
        previous=shown;
      }
      assert.deepEqual(next,saved,'reconciliation must not edit authoritative snapshots');
    }
    const predictor=client.presentation.predictors.get(hero.id),error=Math.hypot(previous.x-predictor.unit.x,previous.y-predictor.unit.y);
    assert.ok(error<initialError*.5,'the display must still converge to the confirmed position');
  }
});

test('remote units move continuously between snapshots and all gameplay queries retain current server values',()=>{
  const {client,state,tick,snapshot}=setup({legacy:true});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[1].x+=30;next.entities[1].hp-=10;snapshot(next);
  const first=client.renderView().entities[1];tick(50);const middle=client.renderView().entities[1];tick(30);const later=client.renderView().entities[1];
  assert.ok(first.x<middle.x&&middle.x<later.x&&later.x<next.entities[1].x);
  assert.equal(middle.hp,next.entities[1].hp);assert.equal(client.entities[1].x,next.entities[1].x);assert.equal(client.time,next.time);
});

test('click movement uses terrain paths and unit footprints without mutating the server snapshot',()=>{
  const {client,state,tick,snapshot}=setup();
  state.entities.push({id:'obstacle',kind:'tower',team:0,x:10485,y:10400,hp:100,maxHp:100,radius:30,bounds:[60,60]});snapshot(state);
  const saved=structuredClone(state);client.moveTo(10800,10400);
  const collisions=new CollisionWorld();collisions.rebuild(client.entities.filter(e=>e.id!==hero.id),client.time);
  let moved=false;
  for(let i=0;i<15;i++){tick(16);const unit=client.renderView().player;moved||=Math.hypot(unit.x-hero.x,unit.y-hero.y)>1;assert.equal(collisions.overlaps(unit),false);assert.equal(client.navigation.isWalkable(unit),true);}
  assert.equal(moved,true);assert.deepEqual(state,saved);assert.equal(client.player.x,hero.x);
});

test('stuns, death, teleports, pause and terminal results immediately restore authoritative poses',()=>{
  for(const event of ['stun','root','death','teleport','pause','end']){
    const {client,state,tick,snapshot}=setup();client.setMovement(1,0);tick(50);client.renderView();
    const next=structuredClone(state);next.time=1.1;next.entities[0].x+=event==='teleport'?1000:10;
    if(event==='stun'||event==='root')next.entities[0].statuses[event]={id:event,startedAt:1.1,until:5};
    if(event==='death'){next.entities[0].dead=true;next.entities[0].hp=0;}
    if(event==='pause')next.paused=true;if(event==='end'){next.status='won';next.winner=0;}
    snapshot(next,1);assert.equal(client.renderView().player.x,next.entities[0].x,event);
  }
});

test('a stalled connection has bounded prediction and reconnect discards stale inputs',()=>{
  const {client,state,tick,snapshot}=setup();client.setMovement(1,0);tick(300);const final=client.renderView().player.x;
  assert.ok(final>hero.x&&final<=hero.x+75.001);tick(2000);assert.equal(client.renderView().player.x,final);
  client.suspendPresentation();assert.equal(client.renderView().player.x,hero.x);assert.equal(client.lastMovement,null);
  tick(1000);snapshot(state,1);tick(16);assert.equal(client.renderView().player.x,hero.x);
});

test('inspecting another unit stops an input still in flight without editing authoritative movement',()=>{
  const {client,requests}=setup();client.setMovement(1,0);client.selectEntity(enemy.id);
  assert.deepEqual(requests.map(r=>[r.action,r.args]),[['setMovement',[1,0]],['setMovement',[0,0]]]);
  assert.deepEqual(client.player.movementInput,{x:0,y:0});assert.equal(client.selected.id,enemy.id);
});
