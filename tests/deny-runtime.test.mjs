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

test('friendly lane deny rejects half-health and non-lane allies without changing the current order',()=>{
 const {g,p,c}=scene();p.explicitTarget='previous';c.hp=150;
 g.attackTarget(c.id);assert.equal(p.explicitTarget,'previous');assert.equal(g._attack(p,c),false);
 c.hp=149;g.attackTarget(c.id);assert.equal(p.explicitTarget,c.id);
 for(const kind of ['hero','tower','barracks','summon','neutral']){
  const ally=g._unit(kind,p.team,p.x+60,p.y,{hp:1,maxHp:300,lane:1});g.entities.push(ally);
  p.explicitTarget='previous';g.attackTarget(ally.id);assert.equal(p.explicitTarget,'previous',kind);assert.equal(g._attack(p,ally),false,kind);
 }
 c.ownerId=p.id;p.explicitTarget='previous';g.attackTarget(c.id);assert.equal(p.explicitTarget,'previous');
});
test('melee lane deny gives owner credit, zero gold and half XP split among living nearby opponents',()=>{
 const {g,p,c,enemy}=scene(),second=g._makeHero('axe',enemy.team,1,false,1),dead=g._makeHero('axe',enemy.team,1,false,2),far=g._makeHero('axe',enemy.team,1,false,3);
 Object.assign(second,{x:c.x+1499,y:c.y});Object.assign(dead,{x:c.x+20,y:c.y,dead:true,hp:0});Object.assign(far,{x:c.x+1501,y:c.y});
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
test('healing or changing allegiance in flight prevents a ranged friendly hit',()=>{
 for(const change of ['heal','changeTeam']){
  const {g,p,c}=scene('windranger');c.x=p.x+500;attack(g,p,c);
  if(change==='heal')c.hp=c.maxHp;else c.team=1-p.team;
  const hp=c.hp;g.time+=1;tickAttacks(g);assert.equal(c.hp,hp,change);assert.equal(p.denies||0,0);
 }
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
