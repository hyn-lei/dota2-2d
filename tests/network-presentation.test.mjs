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
function setup({legacy=false,rttMs=300,match=fixture,playerId=hero.id}={}){
  let now=1000,id=0;const requests=[];
  const state=structuredClone(match),request=(action,args)=>{
    let resolve;const pending=new Promise(r=>resolve=r);pending.commandId=++id;
    requests.push({id,action,args,resolve});return pending;
  };
  const client=new NetworkGame({state,playerId,request,metadata:legacy?{}:{commandId:0,rttMs},clock:()=>now});
  return {client,state,requests,tick:ms=>now+=ms,snapshot:(state,commandId=0)=>client.applySnapshot(state,{...(legacy?{}:{commandId}),rttMs})};
}

function clearProbe(options){
  const probe=setup(options);
  Object.assign(probe.state.entities[0],{x:10000,y:11000});
  Object.assign(probe.state.entities[1],{x:10300,y:11000});
  probe.snapshot(probe.state);return probe;
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

for(const action of ['keyboard','click'])test(`a snapshot arriving at a fresh ${action} turn preserves progress before the predictor takes its first step`,()=>{
    const {client,state,tick,snapshot}=clearProbe();
    if(action==='keyboard')client.setMovement(1,0);else client.moveTo(10400,11000);
    tick(100);const before=client.renderView().player.x;
    if(action==='keyboard')client.setMovement(-1,0);else client.moveTo(9600,11000);
    const next=structuredClone(state);next.time=1.1;
    Object.assign(next.entities[0],{x:10050,movementInput:action==='keyboard'?{x:1,y:0}:{x:0,y:0},destination:action==='click'?{x:10400,y:11000}:null,moving:true});snapshot(next,1);
    const saved=structuredClone(next);let previous=client.renderView().player.x;
    assert.ok(Math.abs(previous-before)<.01,'the snapshot must preserve the visible turn position');
    for(let frame=0;frame<5;frame++){
      tick(16);const current=client.renderView().player.x;
      assert.ok(current<previous,`${action} correction must not pull against a fresh input whose replay ended at the snapshot clock`);previous=current;
    }
    assert.deepEqual(next,saved);assert.equal(client.player.x,10050);
});

test('remote units move continuously between snapshots and all gameplay queries retain current server values',()=>{
  const {client,state,tick,snapshot}=setup({legacy:true});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[1].x+=30;next.entities[1].hp-=10;snapshot(next);
  const first=client.renderView().entities[1];tick(50);const middle=client.renderView().entities[1];tick(30);const later=client.renderView().entities[1];
  assert.ok(first.x<middle.x&&middle.x<later.x&&later.x<next.entities[1].x);
  assert.equal(middle.hp,next.entities[1].hp);assert.equal(client.entities[1].x,next.entities[1].x);assert.equal(client.time,next.time);
});

test('remote walking continues across a short gap and freezes after bounded extrapolation',()=>{
  const {client,state,tick,snapshot}=clearProbe({legacy:true});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[1].x=10330;next.entities[1].hp-=10;snapshot(next);const saved=structuredClone(next);
  tick(200);const first=client.renderView().entities[1];tick(50);const later=client.renderView().entities[1];
  assert.ok(first.x>10330&&later.x>first.x,'remote movement must continue after interpolation exhausts its last pair');
  tick(2000);const final=client.renderView().entities[1];assert.ok(final.x<=10510.001);assert.equal(final.moving,false);
  tick(1000);assert.equal(client.renderView().entities[1].x,final.x);
  assert.equal(client.entities[1].x,10330);assert.equal(later.hp,next.entities[1].hp);assert.deepEqual(next,saved);
});

test('remote extrapolation reconciles a delayed turn without a one-frame position jump',()=>{
  const {client,state,tick,snapshot}=clearProbe({legacy:true});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[1].x=10330;snapshot(next);tick(400);
  const previous=client.renderView().entities[1];assert.ok(previous.x>10400);
  const turned=structuredClone(next);turned.time=1.2;turned.entities[1].x=10300;snapshot(turned);
  assert.ok(Math.abs(client.renderView().entities[1].x-previous.x)<.01,'an ordinary delayed turn must preserve display continuity');
  tick(16);const moved=client.renderView().entities[1];assert.ok(moved.x<previous.x&&previous.x-moved.x<10);
});

test('remote extrapolation stops at known footprints and control interruptions',()=>{
  const {client,state,tick,snapshot}=clearProbe({legacy:true});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[1].x=10330;
  next.entities.push({id:'remote-wall',kind:'tower',team:0,x:10420,y:11000,hp:100,maxHp:100,radius:30,bounds:[60,60]});snapshot(next);
  const collisions=new CollisionWorld();collisions.rebuild(next.entities.filter(e=>e.id!==enemy.id),next.time);
  tick(350);const projected=client.renderView().entities[1];assert.ok(projected.x>10330,'the remote unit should reach the known obstacle');
  assert.equal(collisions.overlaps(projected),false);assert.equal(client.navigation.isWalkable(projected),true);
  const stunned=structuredClone(next);stunned.time=1.2;stunned.entities[1].statuses.stun={id:'stun',startedAt:1.2,until:5};snapshot(stunned);
  assert.equal(client.renderView().entities[1].x,10330);tick(400);assert.equal(client.renderView().entities[1].x,10330);
});

test('approaching remote heroes cannot overlap or cross each other during a receive gap',()=>{
  for(const warmup of [true,false]){
  const match=structuredClone(fixture),first=match.entities[1],second=structuredClone(enemy);
  Object.assign(match.entities[0],{x:9600,y:11000});
  Object.assign(first,{x:10000,y:11000,speed:300,radius:24,collisionRadius:24,moving:true});
  Object.assign(second,{id:'approaching-remote',x:10300,y:11000,speed:300,radius:24,collisionRadius:24,moving:true});
  match.entities.push(second);
  const {client,state,tick,snapshot}=setup({match,rttMs:700});if(warmup)client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[1].x=10030;next.entities[2].x=10270;snapshot(next);
  const saved=structuredClone(next);tick(450);
  let stopped;
  for(let frame=0;frame<20;frame++){
    const view=client.renderView(),a=view.entities.find(e=>e.id===first.id),b=view.entities.find(e=>e.id===second.id);
    const collisions=new CollisionWorld();collisions.rebuild(view.entities.filter(e=>e.id!==a.id),view.time);
    assert.equal(collisions.overlaps(a),false,'each remote must respect the other remote displayed footprint');
    assert.ok(a.x<b.x,'opposing extrapolation must not swap the heroes through one another');
    if(frame===10)stopped={a:a.x,b:b.x};
    if(frame>10)assert.deepEqual({a:a.x,b:b.x},stopped,'contact must stop extrapolation rather than push both heroes through the stale anchors');
    tick(16);
  }
  assert.deepEqual(next,saved);assert.equal(client.entities[1].x,10030);assert.equal(client.entities[2].x,10270);
  }
});

test('a new remote footprint cannot be bypassed by the visual correction offset',()=>{
  const {client,state,tick,snapshot}=clearProbe({legacy:true});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[1].x=10330;snapshot(next);tick(400);client.renderView();
  const blocked=structuredClone(next);blocked.time=1.2;blocked.entities[1].x=10360;
  blocked.entities.push({id:'new-footprint',kind:'creep',team:0,x:10450,y:11000,hp:100,maxHp:100,radius:30});snapshot(blocked);
  const collisions=new CollisionWorld();collisions.rebuild(blocked.entities.filter(e=>e.id!==enemy.id),blocked.time);
  for(let frame=0;frame<10;frame++){assert.equal(collisions.overlaps(client.renderView().entities[1]),false,'the final corrected position must remain outside the new footprint');tick(16);}
});

test('remote correction cannot cross a footprint even when its endpoint lies beyond the obstacle',()=>{
  const {client,state,tick,snapshot}=clearProbe({legacy:true});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[1].x=10330;snapshot(next);tick(600);client.renderView();
  const blocked=structuredClone(next);blocked.time=1.2;blocked.entities[1].x=10360;
  blocked.entities.push({id:'middle-footprint',kind:'creep',team:0,x:10420,y:11000,hp:100,maxHp:100,radius:20});snapshot(blocked);
  const collisions=new CollisionWorld();collisions.rebuild(blocked.entities.filter(e=>e.id!==enemy.id),blocked.time);
  const shown=client.renderView().entities[1],authoritative=blocked.entities[1];
  assert.equal(collisions.overlaps(shown),false);assert.equal(collisions.sweep(authoritative,shown.x-authoritative.x,shown.y-authoritative.y),null,'the complete corrected route must not pass through the middle footprint');
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
  const {client,state,tick,snapshot}=setup();client.setMovement(1,0);tick(1200);const final=client.renderView().player.x;
  assert.ok(final>hero.x&&final<=hero.x+300.001);tick(2000);assert.equal(client.renderView().player.x,final);
  for(let n=0;n<10;n++){client.moveTo(10800+n,10400);tick(100);assert.equal(client.renderView().player.x,final,'fresh commands cannot extend the limit without a new snapshot');}
  client.suspendPresentation();assert.equal(client.renderView().player.x,hero.x);assert.equal(client.lastMovement,null);
  tick(1000);snapshot(state,1);tick(16);assert.equal(client.renderView().player.x,hero.x);
});

test('a fresh movement command responds on the next frame after a half-second snapshot gap',()=>{
  const {client,state,tick}=clearProbe({rttMs:600}),saved=structuredClone(state);
  tick(500);client.setMovement(1,0);tick(16);
  assert.ok(client.renderView().player.x>10001,'a brief snapshot gap must not defer the new local input');
  assert.equal(client.player.x,10000);assert.equal(client.time,1);assert.deepEqual(state,saved);
});

test('held movement continues through a 720ms WAN gap while retaining the latest server position',()=>{
  const {client,tick}=clearProbe({rttMs:600});client.setMovement(-1,0);let previous=10000;
  for(let frame=0;frame<45;frame++){tick(16);const shown=client.renderView().player;assert.ok(shown.x<previous,'every render should advance a held input during the measured short gap');previous=shown.x;}
  assert.equal(client.player.x,10000);
});

test('click movement can reverse immediately after the old quarter-second prediction window',()=>{
  const {client,tick}=clearProbe({rttMs:600});client.moveTo(10400,11000);tick(500);const previous=client.renderView().player.x;
  client.setMovement(-1,0);tick(16);assert.ok(client.renderView().player.x<previous,'a new direction must replace the click intent even while the snapshot is delayed');
});

test('releasing a held input during a delayed snapshot stops the shown pose immediately',()=>{
  const {client,tick}=clearProbe({rttMs:600});client.setMovement(-1,0);tick(720);const previous=client.renderView().player.x;
  client.setMovement(0,0);tick(16);const stopped=client.renderView().player;
  assert.equal(stopped.moving,false);assert.equal(stopped.x,previous);
});

test('a stop freezes the current shown position even during an unfinished server correction',()=>{
  const {client,state,tick,snapshot}=clearProbe({rttMs:600});client.setMovement(-1,0);tick(100);client.renderView();
  const next=structuredClone(state);next.time=1.1;Object.assign(next.entities[0],{x:10025,movementInput:{x:-1,y:0}});snapshot(next,1);
  tick(100);const previous=client.renderView().player.x;client.setMovement(0,0);
  for(let frame=0;frame<10;frame++){tick(16);const stopped=client.renderView().player;assert.equal(stopped.moving,false);assert.equal(stopped.x,previous,'an old smoothing offset must not slide a stopped character');}
  assert.equal(client.player.x,10025);
});

test('fresh movement from an idle correction immediately advances in the requested direction',()=>{
  const {client,state,tick,snapshot}=clearProbe({rttMs:600});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[0].x=9920;snapshot(next);
  let previous=client.renderView().player.x;client.setMovement(1,0);
  for(let frame=0;frame<5;frame++){tick(16);const current=client.renderView().player.x;assert.ok(current>previous,'an idle reconciliation must not overpower a fresh walking direction');previous=current;}
});

test('fresh intents cannot restart a frozen correction after the latest snapshot is over a second old',()=>{
  const {client,state,tick,snapshot}=clearProbe({rttMs:600});client.renderView();tick(100);
  const next=structuredClone(state);next.time=1.1;next.entities[0].x=9920;snapshot(next);tick(1200);
  const frozen=client.renderView().player.x;
  for(let n=0;n<10;n++){client.moveTo(10800+n,11000);tick(100);assert.equal(client.renderView().player.x,frozen,'re-timing a correction must retain the hard snapshot deadline');}
});

test('a delayed direction confirmation beyond 160 units preserves a clear owned movement pose',()=>{
  const {client,state,tick,snapshot}=clearProbe({rttMs:600});client.setMovement(1,0);tick(720);
  let previous=client.renderView().player.x;
  const delayed=structuredClone(state);delayed.time=1.4;
  Object.assign(delayed.entities[0],{x:9900,movementInput:{x:-1,y:0},moving:true});snapshot(delayed);
  assert.ok(Math.abs(client.renderView().player.x-previous)<.01,'ordinary WAN drift beyond the old fixed cutoff must retain the shown position');
  for(let frame=0;frame<10;frame++){tick(16);const shown=client.renderView().player.x;assert.ok(shown>previous,'the delayed confirmation must not pull against the fresh direction');previous=shown;}
  assert.equal(client.player.x,9900);
});

test('an owned correction cannot cross a new footprint whose far endpoint is clear',()=>{
  const {client,state,tick,snapshot}=clearProbe({rttMs:600});client.setMovement(1,0);tick(720);client.renderView();
  const blocked=structuredClone(state);blocked.time=1.4;
  Object.assign(blocked.entities[0],{x:10010,movementInput:{x:-1,y:0},moving:true});
  blocked.entities.push({id:'owned-middle-footprint',kind:'creep',team:0,x:10160,y:11000,hp:100,maxHp:100,radius:20});snapshot(blocked);
  const collisions=new CollisionWorld();collisions.rebuild(blocked.entities.filter(e=>e.id!==hero.id),blocked.time);
  const shown=client.renderView().player,authoritative=blocked.entities[0];
  assert.equal(collisions.overlaps(shown),false);
  assert.equal(collisions.sweep(authoritative,shown.x-authoritative.x,shown.y-authoritative.y),null,'the complete owned correction route must respect the new footprint');
});

test('a decaying owned offset remains outside footprints as its predictor advances',()=>{
  const {client,state,tick,snapshot}=clearProbe({rttMs:600});client.setMovement(1,0);tick(720);client.renderView();
  const blocked=structuredClone(state);blocked.time=1.4;
  Object.assign(blocked.entities[0],{x:10010,movementInput:{x:-1,y:0},moving:true});
  blocked.entities.push({id:'owned-ahead-footprint',kind:'creep',team:0,x:10300,y:11000,hp:100,maxHp:100,radius:20});snapshot(blocked);
  const collisions=new CollisionWorld();collisions.rebuild(blocked.entities.filter(e=>e.id!==hero.id),blocked.time);
  for(let frame=0;frame<25;frame++){tick(16);assert.equal(collisions.overlaps(client.renderView().player),false,'the final displayed owned position must remain outside the known footprint');}
  assert.equal(client.player.x,10010);
});

test('a fresh stop cannot absorb an owned offset that has advanced into a footprint between renders',()=>{
  const {client,state,tick,snapshot}=clearProbe({rttMs:600});client.setMovement(1,0);tick(720);client.renderView();
  const blocked=structuredClone(state);blocked.time=1.4;
  Object.assign(blocked.entities[0],{x:10010,movementInput:{x:-1,y:0},moving:true});
  blocked.entities.push({id:'owned-input-footprint',kind:'creep',team:0,x:10300,y:11000,hp:100,maxHp:100,radius:20});snapshot(blocked);
  const collisions=new CollisionWorld();collisions.rebuild(blocked.entities.filter(e=>e.id!==hero.id),blocked.time);
  for(let frame=0;frame<10;frame++){tick(16);client.renderView();}
  tick(160);client.setMovement(0,0);
  assert.equal(collisions.overlaps(client.renderView().player),false,'fresh input must validate the shown correction before absorbing it');
  assert.equal(client.player.x,10010);
});

test('keyboard control of a real owned Zealot replaces its earlier click destination',()=>{
  const game=new Game({hero:'chen'}),owner=game.player,zealot=game.entities.find(e=>e.zealot&&e.ownerId===owner.id);
  game.entities=[owner,zealot];Object.assign(owner,{x:10000,y:11000});Object.assign(zealot,{x:10100,y:11000});
  const {client,tick}=setup({match:snapshotState(game),playerId:owner.id});
  client.unitCommand(zealot.id,'moveTo',[10400,11000]);tick(100);client.renderView();
  client.unitCommand(zealot.id,'setMovement',[-1,0]);tick(16);const previous=client.renderView().entities.find(e=>e.id===zealot.id);
  client.unitCommand(zealot.id,'setMovement',[0,0]);tick(16);const stopped=client.renderView().entities.find(e=>e.id===zealot.id);
  assert.equal(stopped.moving,false);assert.equal(stopped.x,previous.x,'releasing the Zealot must not resume the superseded ground order');
  assert.equal(client.entities.find(e=>e.id===zealot.id).x,10100);
});

test('inspecting another unit stops an input still in flight without editing authoritative movement',()=>{
  const {client,requests}=setup();client.setMovement(1,0);client.selectEntity(enemy.id);
  assert.deepEqual(requests.map(r=>[r.action,r.args]),[['setMovement',[1,0]],['setMovement',[0,0]]]);
  assert.deepEqual(client.player.movementInput,{x:0,y:0});assert.equal(client.selected.id,enemy.id);
});
