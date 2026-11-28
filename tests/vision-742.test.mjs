import test from 'node:test';
import assert from 'node:assert/strict';

const unit=(id,team,x,y,stats={})=>({id,team,x,y,kind:'hero',hp:100,visionDay:1800,visionNight:800,statuses:{},...stats});
const terrainGame=(...entities)=>({time:0,entities});
const hidden={startedAt:0,until:1000,invisible:true};

test('terrain prevents river vision uphill and team sight can reveal the same uphill target',async()=>{
 const {canSeeEntity}=await import('../src/vision.js');
 const river=unit('river',0,9856,9792),high=unit('high',1,9856,9600),g=terrainGame(river,high);
 assert.equal(canSeeEntity(g,river,high),false);
 assert.equal(canSeeEntity(g,high,river),true);
 const observer=unit('observer',0,9856,9536,{kind:'ward',wardType:'observer'});
 g.entities.push(observer);
 assert.equal(canSeeEntity(g,river,high),true);
 observer.hp=0;
 assert.equal(canSeeEntity(g,river,high),false);
});

test('a tree blocks ground sight until expiry while a flying Swarm beetle sees through it',async()=>{
 const {canSeeEntity}=await import('../src/vision.js');
 const river=unit('river',0,9856,9792),across=unit('across',1,9856,10048),g=terrainGame(river,across);
 assert.equal(canSeeEntity(g,river,across),true);
 g.plantedTrees=[{x:9856,y:9920,until:20}];
 assert.equal(canSeeEntity(g,river,across),false);
 g.entities.push(unit('beetle',0,9856,9792,{kind:'weaverBeetle',visionRange:321,providesVision:true}));
 assert.equal(canSeeEntity(g,river,across),true);
 g.entities.pop();
 g.time=20;
 assert.equal(canSeeEntity(g,river,across),true);
});

test('The Swarm reveals and attaches to an enemy above the mid river at night',async()=>{
 const {Game}=await import('../src/engine.js');
 const g=new Game({hero:'weaver'}),h=g.player,target=g._makeHero('axe',1,1,false,0);
 g.time=308;g.entities=[h,target];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 Object.assign(h,{x:9856,y:9792,abilityLevels:[1,0,0,0],mana:200,attackCooldown:Infinity});
 Object.assign(target,{x:9856,y:9600,aiTimer:Infinity,attackCooldown:Infinity,hpRegen:0});
 g._index();assert.equal(g.canSee(h,target),false);
 assert.equal(g.cast(0,{x:9856,y:9328}).ok,true);g.step(.75);
 const beetle=g.entities.find(unit=>unit.swarmTargetId===target.id&&!unit.dead);
 assert.ok(beetle);assert.equal(g.canSee(h,target),true);
 assert.ok(target.hp<target.maxHp);assert.equal(target.statuses['weaverSwarm:'+h.id].armor,-1);
});

test('true sight requires ordinary team vision and does not reveal smoke',async()=>{
 const {canSeeEntity,hasTeamTrueSight,teamCanSeePoint}=await import('../src/vision.js');
 const viewer=unit('viewer',0,9856,9792,{visionDay:100,visionNight:100}),target=unit('target',1,9856,10048,{statuses:{hidden}});
 const sentry=unit('sentry',0,9856,9984,{kind:'ward',wardType:'sentry',trueSight:1050,visionDay:0,visionNight:0});
 const g=terrainGame(viewer,target,sentry);
 assert.equal(hasTeamTrueSight(g,0,target),true);
 assert.equal(teamCanSeePoint(g,0,target),false);
 assert.equal(canSeeEntity(g,viewer,target),false);
 const observer=unit('observer',0,9856,9792,{kind:'ward',wardType:'observer'});
 g.entities.push(observer);
 assert.equal(teamCanSeePoint(g,0,target),true);
 assert.equal(canSeeEntity(g,viewer,target),true);
 target.statuses.smoke={...hidden,smoked:true};
 assert.equal(canSeeEntity(g,viewer,target),false);
 delete target.statuses.smoke;
 sentry.hp=0;
 Object.assign(observer,{kind:'hero',inventory:['gem'],inventoryMeta:[{ownerId:observer.id,readyAt:1}]});
 assert.equal(canSeeEntity(g,viewer,target),false);
 g.time=1;
 assert.equal(canSeeEntity(g,viewer,target),true);
});

test('a planted sentry sees nearby for twelve seconds and gem Reveal exposes a unit through fog',async()=>{
 const {canSeeEntity,teamCanSeePoint}=await import('../src/vision.js');
 const viewer=unit('viewer',0,9200,9500,{visionDay:1,visionNight:1});
 const sentry=unit('sentry',0,9856,9792,{kind:'ward',wardType:'sentry',trueSight:1050,expiresAt:420});
 const target=unit('target',1,9856,9856,{statuses:{hidden,legacy:{...hidden,revealed:true}}});
 const g=terrainGame(viewer,sentry,target);
 assert.equal(canSeeEntity(g,viewer,target),true);
 g.time=12;
 assert.equal(teamCanSeePoint(g,0,target),false);
 assert.equal(canSeeEntity(g,viewer,target),false);
 target.statuses.smoke={...hidden,smoked:true};
 target.statuses.gem={...hidden,revealed:true,revealedTeam:0,itemId:'gem',until:16};
 assert.equal(canSeeEntity(g,viewer,target),true);
 assert.equal(teamCanSeePoint(g,0,target),false);
 g.time=16;
 assert.equal(canSeeEntity(g,viewer,target),false);
});

test('Gem Reveal reaches an uphill ward only when the caster targets a point in range',async()=>{
 const {Game}=await import('../src/engine.js');
 const {giveItem}=await import('../src/inventory.js');
 const g=new Game(),h=g.player;
 Object.assign(h,{x:9856,y:9792});
 const ward={id:'hill-ward',x:9856,y:9600,kind:'ward',team:1,hp:2,radius:16,statuses:{hidden}};
 g.entities=[h,ward];
 assert.equal(giveItem(g,h,'gem').ok,true);
 assert.equal(g.canSee(h,ward),false);
 assert.equal(g.useItem(0,{x:9000,y:9600}).ok,false);
 assert.equal(g.useItem(0,ward).ok,true);
 assert.equal(g.canSee(h,ward),true);
});

test('shared hero memory retains only an observed position after nightfall',async()=>{
 const {captureTeamVision}=await import('../src/vision.js');
 const viewer=unit('viewer',0,9920,10112,{flying:true}),target=unit('target',1,10944,10112,{heroId:'weaver'}),g=terrainGame(viewer,target);
 g.time=299;
 assert.equal(captureTeamVision(g,0).visibleIds.has(target.id),true);
 g.time=300;
 target.x=11648;
 const fog=captureTeamVision(g,0);
 assert.equal(fog.visibleIds.has(target.id),false);
 assert.deepEqual(fog.lastSeen,[{id:'target',heroId:'weaver',team:1,x:10944,y:10112,seenAt:299}]);
 g.time=320;
 assert.deepEqual(captureTeamVision(g,0).lastSeen,[]);
});
