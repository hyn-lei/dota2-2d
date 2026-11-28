import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {CoopGame} from '../server/coop-game.mjs';
import {executeCommand} from '../server/commands.mjs';
import {snapshotState} from '../server/snapshot.mjs';
import {NetworkGame} from '../src/network-game.js';
import {serializeMatch,restoreMatch} from '../src/game-save.js';
import {tickAttacks} from '../src/attack-projectiles.js';
import {controlUnit} from '../src/controlled-units.js';

const command=(action,args)=>({type:'command',id:1,action,args});
function scene(hero='juggernaut',game=new Game({hero})){
 game._spawnWave();const p=game.player,c=game.entities.find(e=>e.kind==='creep'&&e.team===p.team&&!e.ranged);
 const enemy=game._makeHero('crystal_maiden',1-p.team,1,false,0);
 Object.assign(p,{x:10400,y:10400,hpRegen:0,manaRegen:0,attackCooldown:0,abilityLevels:[0,0,0,0],movementInput:{x:0,y:0}});
 Object.assign(c,{x:10540,y:10400,maxHp:300,hp:1,armor:0,hpRegen:0,attackCooldown:999,speed:0,xpBounty:60});
 Object.assign(enemy,{x:10700,y:10400,aiTimer:Infinity,attackCooldown:999});
 game.entities=[p,c,enemy];game.nextWave=game.nextNeutralSpawn=game.roshanRespawnAt=Infinity;game._index();
 return {g:game,p,c,enemy};
}
function attack(g,p,c){g.attackTarget(c.id);g._playerTick(p,.01);}

test('friendly lane deny accepts exactly half-health and rejects higher health and ineligible allies',()=>{
 const {g,p,c}=scene();p.explicitTarget='previous';c.hp=151;
 g.attackTarget(c.id);assert.equal(p.explicitTarget,'previous');assert.equal(g._attack(p,c),false);
 c.hp=150;g.attackTarget(c.id);assert.equal(p.explicitTarget,c.id);
 for(const kind of ['hero','ancient','fountain','summon','neutral','illusion','courier']){
  const ally=g._unit(kind,p.team,p.x+60,p.y,{maxHp:300,lane:1});ally.hp=1;g.entities.push(ally);
  p.explicitTarget='previous';g.attackTarget(ally.id);assert.equal(p.explicitTarget,'previous',kind);assert.equal(g._attack(p,ally),false,kind);
 }
 c.ownerId=p.id;p.explicitTarget='previous';g.attackTarget(c.id);assert.equal(p.explicitTarget,'previous');
});
test('melee lane deny gives owner credit, zero gold and half XP split among living nearby opponents',()=>{
 const {g,p,c,enemy}=scene(),second=g._makeHero('axe',enemy.team,1,false,1),dead=g._makeHero('axe',enemy.team,1,false,2),far=g._makeHero('axe',enemy.team,1,false,3);
 Object.assign(second,{x:c.x+1499,y:c.y});Object.assign(dead,{x:c.x+20,y:c.y,dead:true,hp:0});Object.assign(far,{x:c.x+1525,y:c.y});
 const gold=p.gold,lastHits=p.lastHits,before=[p,enemy,second,dead,far].map(e=>e.xp);attack(g,p,c);
 assert.equal(c.dead,true);assert.equal(p.denies,1);assert.equal(p.gold,gold);assert.equal(p.lastHits,lastHits);
 assert.deepEqual([p,enemy,second,dead,far].map((e,i)=>e.xp-before[i]),[0,15,15,0,0]);
 g._kill(c,p);assert.equal(p.denies,1);
});
test('enemy lane last hit still grants bounty, last hit credit and full nearby XP',()=>{
 const {g,p,c,enemy}=scene();c.team=enemy.team;const gold=p.gold,xp=p.xp;attack(g,p,c);
 assert.equal(c.dead,true);assert.equal(p.lastHits,1);assert.ok(p.gold>gold);assert.equal(p.xp-xp,60);assert.equal(p.denies||0,0);
});
test('healing a queued friendly creep cancels the deny order and causes no damage',()=>{
 const {g,p,c}=scene();g.attackTarget(c.id);c.hp=c.maxHp;g._playerTick(p,.01);
 assert.equal(c.hp,c.maxHp);assert.equal(p.explicitTarget,null);assert.equal(p.targetId,null);
 assert.equal(g.damage(c,999,p,'physical',{attack:true}),0);assert.equal(c.dead,false);
});
test('Chen deny respects the attack point and cancels when the ally is healed before release',()=>{
 const {g,p,c}=scene('chen');g.attackTarget(c.id);g._playerTick(p,.01);assert.equal(c.dead,false);assert.ok(p.attackPhase);
 c.hp=c.maxHp;g.time=p.attackPhase.executeAt;g._resolveOgreAttack(p);
 assert.equal(c.hp,c.maxHp);assert.equal(g.pendingSpells.length,0);assert.equal(p.denies||0,0);
});
test('ranged deny settles at projectile arrival and survives a save without duplicate rewards',()=>{
 const {g,p,c,enemy}=scene('windranger');c.x=p.x+500;g.attackTarget(c.id);g._playerTick(p,.01);
 const shot=g.pendingSpells.find(s=>s.type==='attack');assert.ok(shot);assert.equal(c.dead,false);
 g.time+=.1;tickAttacks(g);assert.equal(c.dead,false);
 const restored=restoreMatch(JSON.parse(serializeMatch(g))),target=restored.entities.find(e=>e.id===c.id),foe=restored.entities.find(e=>e.id===enemy.id);
 const gold=restored.player.gold,xp=foe.xp;restored.time+=1;tickAttacks(restored);
 assert.equal(target.dead,true);assert.equal(restored.player.denies,1);assert.equal(restored.player.gold,gold);assert.equal(foe.xp-xp,30);
 restored.time+=1;tickAttacks(restored);assert.equal(restored.player.denies,1);assert.equal(foe.xp-xp,30);
 assert.equal(snapshotState(restored).entities.find(e=>e.id===p.id).denies,1);
});
test('a released ranged lane deny lands after healing while a change of team cancels it',()=>{
 const healed=scene('windranger');healed.c.x=healed.p.x+500;attack(healed.g,healed.p,healed.c);
 healed.c.hp=healed.c.maxHp;healed.g.time+=1;tickAttacks(healed.g);
 assert.ok(healed.c.hp<healed.c.maxHp&&healed.c.hp>0);
 assert.equal(healed.p.denies||0,0);
 const switched=scene('windranger');switched.c.x=switched.p.x+500;attack(switched.g,switched.p,switched.c);
 switched.c.team=1-switched.p.team;switched.g.time+=1;tickAttacks(switched.g);
 assert.equal(switched.c.hp,1);
 assert.equal(switched.p.denies||0,0);
});
test('lane deny does not consume Kunkka cleave or trigger lifesteal and item procs',()=>{
 const {g,p,c,enemy}=scene('kunkka');p.abilityLevels=[0,1,0,0];p.cooldowns[1]=0;p.inventory=['lifesteal','desolator','maelstrom'];g._refreshHero(p);p.hp=100;
 const hp=enemy.hp;attack(g,p,c);
 assert.equal(c.dead,true);assert.equal(p.cooldowns[1],0);assert.equal(p.hp,100);assert.equal(enemy.hp,hp);
 assert.equal(g.itemZones?.length||0,0);
});
test('ordinary friendly creeps cannot deny automatically and owned attackers credit their hero',()=>{
 const {g,p,c}=scene();const ordinary=g._unit('creep',p.team,p.x,p.y,{damage:999,range:150,attackCooldown:0});g.entities.push(ordinary);
 assert.equal(g._attack(ordinary,c),false);
 const illusion=g._unit('illusion',p.team,p.x,p.y,{ownerId:p.id,sourceId:p.heroId,damage:50,range:150,attackCooldown:0,attackInterval:1,illusionOutgoing:.5});g.entities.push(illusion);
 assert.equal(g.unitCommand(illusion.id,'attackTarget',[c.id]).ok,true);g._playerTick(illusion,.01);
 assert.equal(c.dead,true);assert.equal(p.denies,1);assert.equal(p.lastHits,0);assert.equal(illusion.denies,undefined);
});
test('illusion deny uses the existing outgoing damage fraction',()=>{
 const {g,p,c}=scene();c.hp=100;
 const illusion=g._unit('illusion',p.team,p.x,p.y,{ownerId:p.id,sourceId:p.heroId,damage:50,range:150,attackCooldown:0,attackInterval:1,illusionOutgoing:.5});g.entities.push(illusion);
 assert.equal(g._attack(illusion,c),true);assert.equal(c.hp,75);
});
test('a released ranged deny still lands after its attacker dies',()=>{
 const {g,p,c}=scene('windranger');c.x=p.x+500;attack(g,p,c);p.dead=true;p.hp=0;
 g.time+=1;tickAttacks(g);assert.equal(c.dead,true);assert.equal(p.denies,1);
});
test('Chen zealot executes an authoritative deny through its actual controlled-unit tick',()=>{
 const game=new CoopGame([{heroId:'chen',name:'Chen',clientId:'chen:deny'}],{fillWithAI:true}),zealot=game.entities.find(e=>e.zealot&&e.ownerId===game.player.id);
 const {g,p,c}=scene('chen',game);g.entities.push(zealot);Object.assign(zealot,{x:p.x,y:p.y,attackCooldown:0});
 const gold=p.gold;
 assert.equal(executeCommand(g,p.id,command('unitCommand',[zealot.id,'attackTarget',[c.id]])).ok,true);
 controlUnit(g,zealot,.01);
 if(zealot.attackPhase){g.time=zealot.attackPhase.executeAt;g._resolveOgreAttack(zealot);}
 assert.equal(c.dead,true);assert.equal(p.denies,1);assert.equal(p.gold,gold);assert.equal(p.lastHits,0);
});
test('changing a deny target team during the attack point cancels without enemy last-hit rewards',()=>{
 const {g,p,c}=scene('chen');attack(g,p,c);assert.ok(p.attackPhase);
 const gold=p.gold;c.team=1-p.team;g.time=p.attackPhase.executeAt;g._resolveOgreAttack(p);g.time+=1;tickAttacks(g);
 assert.equal(c.dead,false);assert.equal(c.hp,1);assert.equal(p.gold,gold);assert.equal(p.lastHits,0);assert.equal(p.denies||0,0);
});
test('authority and network use the same lane deny eligibility and settlement',async()=>{
 const {g,p,c,enemy}=scene('juggernaut',new CoopGame([{heroId:'juggernaut',name:'Player',clientId:'deny:1'}],{fillWithAI:true}));
 const client=new NetworkGame({state:snapshotState(g),playerId:p.id,request:(action,args)=>Promise.resolve(executeCommand(g,p.id,command(action,args)))});
 c.hp=c.maxHp;assert.equal(executeCommand(g,p.id,command('attackTarget',[c.id])).ok,false);
 c.hp=1;client.applySnapshot(snapshotState(g));assert.equal(client.canAttackTarget(client.player,client.entities.find(e=>e.id===c.id)),true);
 assert.equal((await client.attackTarget(c.id)).ok,true);const gold=p.gold,xp=enemy.xp;g._playerTick(p,.01);
 assert.equal(c.dead,true);assert.equal(p.gold,gold);assert.equal(enemy.xp-xp,30);
 client.applySnapshot(snapshotState(g));assert.equal(client.player.denies,1);
});

function buildingScene(game,building){
 const ally=game.entities.find(e=>e.kind==='hero'&&e.team===game.player.team&&e!==game.player);
 const {g,p,enemy}=scene(game.player.heroId,game);
 Object.assign(building,{x:p.x+150,y:p.y,armor:0,baseArmor:0});
 Object.assign(ally,{x:4000,y:4000});
 Object.assign(enemy,{x:17000,y:17000,dead:true,hp:0,respawnTimer:60});
 g.entities=[p,ally,building,enemy];g._index();
 return {g,p,ally,enemy};
}
function towerScene(game=new Game(),tier=1){
 const tower=game.entities.find(e=>e.kind==='tower'&&e.team===game.player.team&&e.tier===tier&&e.lane===1);
 return {...buildingScene(game,tower),tower};
}
function barracksScene(game=new Game(),type='melee'){
 const barracks=game.entities.find(e=>e.kind==='barracks'&&e.team===game.player.team&&e.barracksType===type&&e.lane===1);
 return {...buildingScene(game,barracks),barracks};
}

test('tower deny requires below ten percent and splits gold without a last-hit bonus',()=>{
 const {g,p,ally,tower,enemy}=towerScene(),heroes=[p,ally,enemy],gold=heroes.map(h=>h.gold);
 tower.hp=tower.maxHp*.1;
 assert.equal(g.attackTarget(tower.id).ok,false);
 tower.hp-=1;
 g.attackTarget(tower.id);assert.equal(p.explicitTarget,tower.id);
 g._playerTick(p,.01);
 assert.ok(tower.hp>0&&tower.hp<tower.maxHp*.1-1,'ordinary attack chips the tower');
 assert.deepEqual(heroes.map(h=>h.gold),gold);
 tower.hp=1;p.attackCooldown=0;g._playerTick(p,.01);
 assert.equal(tower.dead,true);
 assert.deepEqual(heroes.map((h,i)=>h.gold-gold[i]),[37,37,37]);
 assert.equal(p.lastHits,0);
 assert.ok(g.feed[0].text.includes('反补'));
});

test('authority rejects protected tower denies and settles a valid ranged tower deny on arrival',async()=>{
 const game=new CoopGame([{heroId:'windranger',name:'Player',clientId:'deny:tower'}],{fillWithAI:true});
 const outer=game.entities.find(e=>e.kind==='tower'&&e.team===game.player.team&&e.tier===1&&e.lane===1);
 const {g,p,tower,enemy}=towerScene(game,2);
 const client=new NetworkGame({state:snapshotState(g),playerId:p.id,request:(action,args)=>Promise.resolve(executeCommand(g,p.id,command(action,args)))});
 tower.hp=1;
 g.entities.push(outer);
 assert.equal(executeCommand(g,p.id,command('attackTarget',[tower.id])).ok,false);
 g.entities.pop();
 assert.equal(executeCommand(g,p.id,command('useGlyph',[])).ok,true);
 assert.equal(executeCommand(g,p.id,command('attackTarget',[tower.id])).ok,false);
 g.time+=8;
 const gold=p.gold,enemyGold=enemy.gold;
 client.applySnapshot(snapshotState(g));
 assert.equal(client.canAttackTarget(client.player,client.entities.find(e=>e.id===tower.id)),true);
 assert.equal((await client.attackTarget(tower.id)).ok,true);
 g._playerTick(p,.01);
 assert.equal(tower.dead,false);assert.equal(p.gold,gold);
 assert.ok(g.pendingSpells.some(s=>s.type==='attack'));
 g.time+=1;tickAttacks(g);
 assert.equal(tower.dead,true);assert.equal(p.gold-gold,50);assert.equal(enemy.gold-enemyGold,50);
 client.applySnapshot(snapshotState(g));
 assert.equal(client.entities.find(e=>e.id===tower.id).dead,true);
 assert.equal(client.player.gold-gold,50);
});

test('backdoor repairs enemy damage without restoring damage from a tower deny',()=>{
 const {g,p,tower,enemy}=towerScene(new Game(),2);
 tower.hp=100;g._updateBackdoor();
 assert.equal(tower.backdoorActive,true);
 g.damage(tower,20,enemy,'pure');assert.equal(tower.hp,90);
 attack(g,p,tower);const deniedDamage=90-tower.hp;
 assert.ok(deniedDamage>0&&tower.hp>0);
 g.step(.2);
 assert.equal(tower.hp,100-deniedDamage);
});

test('destroying an enemy tower still grants team gold and the last hitter bonus',()=>{
 const {g,p,ally,tower,enemy}=towerScene();
 tower.team=enemy.team;tower.hp=1;
 const gold=p.gold,allyGold=ally.gold,enemyGold=enemy.gold;
 attack(g,p,tower);
 assert.equal(tower.dead,true);
 assert.equal(p.gold-gold,175);assert.equal(ally.gold-allyGold,75);assert.equal(enemy.gold,enemyGold);
});

test('melee barracks deny grants only the enemy team bounty and upgrades its melee wave',()=>{
 const game=new Game(),baseTower=game.entities.find(e=>e.kind==='tower'&&e.team===game.player.team&&e.tier===4);
 const {g,p,ally,enemy,barracks}=barracksScene(game);
 g.entities.push(baseTower);
 g._buildingArmor();
 const heroes=[p,ally,enemy],gold=heroes.map(h=>h.gold),xp=heroes.map(h=>h.xp);
 const protectedArmor=baseTower.armor;
 barracks.hp=barracks.maxHp*.1;
 assert.equal(g.attackTarget(barracks.id).ok,false);
 barracks.hp=1;
 attack(g,p,barracks);
 assert.equal(barracks.dead,true);
 assert.deepEqual(heroes.map((h,i)=>h.gold-gold[i]),[0,0,125]);
 assert.deepEqual(heroes.map(h=>h.xp),xp);
 assert.equal(baseTower.armor,protectedArmor-4);
 g._spawnWave();
 const lane=g.entities.filter(e=>e.kind==='creep'&&e.team===enemy.team&&e.lane===barracks.lane);
 assert.ok(lane.some(e=>!e.ranged&&e.upgrade==='super'));
 assert.ok(lane.some(e=>e.ranged&&e.upgrade==='normal'));
});

test('authority denies exposed ranged barracks on projectile impact and grants full opposing team gold',async()=>{
 const game=new CoopGame([{heroId:'windranger',name:'Player',clientId:'deny:barracks'}],{fillWithAI:true});
 const guard=game.entities.find(e=>e.kind==='tower'&&e.team===game.player.team&&e.tier===3&&e.lane===1);
 const {g,p,barracks,enemy}=barracksScene(game,'ranged');
 const client=new NetworkGame({state:snapshotState(g),playerId:p.id,request:(action,args)=>Promise.resolve(executeCommand(g,p.id,command(action,args)))});
 barracks.hp=1;
 g.entities.push(guard);
 assert.equal((await client.attackTarget(barracks.id)).ok,false);
 g.entities.pop();
 assert.equal(executeCommand(g,p.id,command('useGlyph',[])).ok,true);
 assert.equal((await client.attackTarget(barracks.id)).ok,false);
 g.time+=8;
 const gold=p.gold,enemyGold=enemy.gold;
 client.applySnapshot(snapshotState(g));
 assert.equal(client.canAttackTarget(client.player,client.entities.find(e=>e.id===barracks.id)),true);
 assert.equal((await client.attackTarget(barracks.id)).ok,true);
 g._playerTick(p,.01);
 assert.equal(barracks.dead,false);
 assert.equal(enemy.gold,enemyGold);
 g.time+=1;tickAttacks(g);
 assert.equal(barracks.dead,true);
 assert.equal(p.gold,gold);
 assert.equal(enemy.gold-enemyGold,100);
 client.applySnapshot(snapshotState(g));
 assert.equal(client.entities.find(e=>e.id===barracks.id).dead,true);
});

test('backdoor repairs enemy damage without undoing barracks deny damage',()=>{
 const {g,p,barracks,enemy}=barracksScene();
 Object.assign(barracks,{hp:100,hpRegen:0});
 g._updateBackdoor();
 g.damage(barracks,20,enemy,'pure');
 assert.equal(barracks.hp,90);
 attack(g,p,barracks);
 const deniedDamage=90-barracks.hp;
 assert.ok(deniedDamage>0&&barracks.hp>0);
 g.step(.2);
 assert.equal(barracks.hp,100-deniedDamage);
});

test('base filler deny requires exposure and below ten percent health and grants no rewards',()=>{
 const game=new Game(),team=game.player.team;
 const filler=game.entities.find(e=>e.kind==='filler'&&e.team===team);
 const guards=game.entities.filter(e=>e.kind==='tower'&&e.team===team&&e.tier===3);
 const {g,p,ally,enemy}=buildingScene(game,filler),heroes=[p,ally,enemy];
 const rewards=heroes.map(h=>[h.gold,h.xp,h.lastHits,h.denies]);
 g.entities.push(...guards);filler.hp=1;
 assert.equal(g.attackTarget(filler.id).ok,false);
 guards[0].dead=true;
 filler.hp=filler.maxHp*.1;
 assert.equal(g.attackTarget(filler.id).ok,false);
 filler.hp=1;
 attack(g,p,filler);
 assert.equal(filler.dead,true);
 assert.deepEqual(heroes.map(h=>[h.gold,h.xp,h.lastHits,h.denies]),rewards);
 assert.ok(g.feed[0].text.includes('反补'));
 assert.equal(g.status,'playing');
});

test('destroying an exposed enemy base filler still pays its last-hit bounty',()=>{
 const game=new Game(),team=1-game.player.team;
 const filler=game.entities.find(e=>e.kind==='filler'&&e.team===team);
 const guard=game.entities.find(e=>e.kind==='tower'&&e.team===team&&e.tier===3);
 const {g,p,ally}=buildingScene(game,filler),gold=p.gold,allyGold=ally.gold;
 guard.dead=true;g.entities.push(guard);filler.hp=1;
 attack(g,p,filler);
 assert.equal(filler.dead,true);
 assert.equal(p.gold-gold,filler.bounty);
 assert.equal(ally.gold,allyGold);
});

test('denying a Chen-owned creep prevents gold and experience for both teams',()=>{
 const {g,p,enemy}=scene();
 const chen=g._makeHero('chen',p.team,0,false,1);
 const creep=g._unit('summon',p.team,p.x+90,p.y,{ownerId:chen.id,maxHp:300,xpBounty:76,bounty:75});
 creep.hp=150;
 g.entities.push(chen,creep);g._index();
 assert.equal(g.attackTarget(creep.id).ok,false);
 const heroes=[p,chen,enemy],rewards=heroes.map(h=>[h.gold,h.xp]);
 creep.hp=1;attack(g,p,creep);
 assert.equal(creep.dead,true);
 assert.deepEqual(heroes.map(h=>[h.gold,h.xp]),rewards);
 assert.equal(p.lastHits,0);
});

test('full-health allied observer ward can be denied by a teammate to unblock a camp',()=>{
 const {g,p}=scene(),camp=g.camps[0],ally=g._makeHero('crystal_maiden',p.team,0,false,1);
 const ward=g._unit('ward',p.team,p.x+85,p.y,{ownerId:ally.id,wardType:'observer',maxHp:2,hp:2,radius:12});
 g.entities=[p,ally,ward];g.camps=[camp];g._index();
 assert.equal(g.attackTarget(ward.id).ok,false);
 const west=Math.min(...camp.spawnBox.map(point=>point.x));
 Object.assign(ward,{x:west+15,y:camp.y});
 Object.assign(p,{x:west-70,y:camp.y});g._index();
 g._spawnCamps();
 assert.equal(camp.blocked,true);
 attack(g,p,ward);
 assert.equal(ward.hp,1);
 p.attackCooldown=0;g._playerTick(p,.01);
 assert.equal(ward.dead,true);
 g._spawnCamps();
 assert.equal(camp.blocked,false);
 assert.ok(g.entities.some(e=>e.campId===camp.id&&e.kind==='neutral'));
});

test('denied lane creep grants experience at 1524 center distance and not at 1525',()=>{
 const {g,p,c,enemy}=scene();
 const beyond=g._makeHero('axe',enemy.team,1,false,1);
 Object.assign(enemy,{x:c.x+1524,y:c.y});
 Object.assign(beyond,{x:c.x+1525,y:c.y});
 g.entities.push(beyond);g._index();
 attack(g,p,c);
 assert.equal(c.dead,true);
 assert.equal(enemy.xp,30);
 assert.equal(beyond.xp,0);
});

test('a ward expiring on the spawn tick does not block the camp for another minute',()=>{
 const {g,p}=scene(),camp=g.camps[0];
 const ward=g._unit('ward',p.team,camp.x,camp.y,{ownerId:p.id,wardType:'sentry',maxHp:2,expiresAt:60});
 const west=Math.min(...camp.spawnBox.map(point=>point.x));
 Object.assign(p,{x:west-70,y:camp.y});
 g.entities=[p,ward];g.camps=[camp];g._index();
 g.time=59.98;g.nextNeutralSpawn=60;
 g.step(.02);
 assert.equal(ward.dead,true);
 assert.equal(camp.blocked,false);
 assert.ok(g.entities.some(e=>e.campId===camp.id&&e.kind==='neutral'));
});

test('a lane deny projectile is cancelled when both converted units change sides',()=>{
 const {g,p,c,enemy}=scene();
 const ranged=g._unit('summon',p.team,p.x,p.y,{ownerId:p.id,range:600,damage:70,attackCooldown:0});
 g.entities.push(ranged);g._index();
 assert.equal(g._attack(ranged,c,{attackReleased:true}),true);
 assert.ok(g.pendingSpells.some(spell=>spell.type==='attack'));
 for(const unit of [c,ranged])Object.assign(unit,{kind:'summon',team:enemy.team,ownerId:enemy.id});
 const hp=c.hp;
 g.time+=1;tickAttacks(g);
 assert.equal(c.hp,hp);
 assert.equal(c.dead,false);
});

test('owned crystal clones and boss creatures are ineligible for ordinary controlled-unit denies',()=>{
 const {g,p}=scene();
 for(const special of ['crystalClone','isTormentor','isRoshan']){
  const unit=g._unit('summon',p.team,p.x+90,p.y,{ownerId:p.id,maxHp:300,[special]:true});
  unit.hp=1;g.entities.push(unit);g._index();
  assert.equal(g.attackTarget(unit.id).ok,false,special);
  assert.equal(g._attack(p,unit),false,special);
  assert.equal(unit.hp,1);
 }
});
