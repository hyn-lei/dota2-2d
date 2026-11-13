import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {CoopGame} from '../server/coop-game.mjs';
import {executeCommand} from '../server/commands.mjs';
import {illusion} from '../src/item-common.js';
import {weakIllusion,strongIllusion} from '../src/illusions.js';
import {createMeta} from '../src/inventory.js';
import {Navigator} from '../src/navigation.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
import {attackModifiers} from '../src/hero-runtime.js';
import {marksmanshipActive} from '../src/drow-runtime.js';
const setup=(hero='juggernaut')=>{const g=new Game({hero});g.entities=[g.player];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g.navigation=new Navigator({cols:160,rows:160,cellSize:64,blocked:'0'.repeat(25600)},[]);Object.assign(g.player,{x:6000,y:6000,level:15,abilityLevels:[4,4,4,2],talents:[],skillPoints:0});g._refreshHero(g.player);return g;};
const equip=(g,ids)=>{const h=g.player;h.inventory=ids;h.inventoryMeta=ids.map(id=>createMeta(h,id));g._refreshHero(h);h.mana=h.maxMana;};
test('Manta produces two weak illusions with independent item/ability copies and original damage multipliers',()=>{
 const g=setup();equip(g,['manta','greater_crit']);const p=g.player;assert.equal(g.useItem(0,p).ok,true);const clones=g.entities.filter(e=>e.kind==='illusion');assert.equal(clones.length,2);
 for(const c of clones){assert.equal(weakIllusion(c),true);assert.equal(c.ownerId,p.id);assert.deepEqual(c.abilityLevels,p.abilityLevels);assert.deepEqual(c.inventory,p.inventory);assert.notEqual(c.inventoryMeta[1].uid,p.inventoryMeta[1].uid);assert.equal(c.inventoryMeta[1].ownerId,c.id);assert.equal(c.illusionOutgoing,.33);assert.equal(c.illusionIncoming,3);assert.equal(c.mana,0);assert.equal(c.maxMana,0);assert.equal(g.unitCommand(c.id,'cast',[0,c]).ok,false);assert.equal(g.unitCommand(c.id,'useItem',[0,c,'inventory']).ok,false);}
 clones[0].inventoryMeta[1].charges=999;assert.notEqual(p.inventoryMeta[1].charges,999);assert.notEqual(clones[1].inventoryMeta[1].charges,999);
});
test('uncommanded strong illusions neither follow a moving owner nor acquire nearby enemies',()=>{
 const g=setup(),p=g.player,c=illusion(g,p,1,60,33,300,{type:'strong'})[0],enemy=g._unit('creep',1,c.x+80,c.y,{maxHp:10000,speed:0});g.entities.push(enemy);g._creepTick=()=>{};g._chooseTarget=()=>null;g.moveTo(6800,6000);const start={x:c.x,y:c.y,hp:enemy.hp};g.step(1);
 assert.ok(p.x>6200);assert.equal(c.x,start.x);assert.equal(c.y,start.y);assert.equal(enemy.hp,start.hp);assert.equal(c.targetId,null);
 assert.equal(g.unitCommand(c.id,'attackTarget',[enemy.id]).ok,true);g.step(1);assert.ok(enemy.hp<start.hp);g.unitCommand(c.id,'stop');const hp=enemy.hp;g.step(1);assert.equal(enemy.hp,hp);
});
test('manual illusion movement/stop is independent of the hero and other illusions; expiry releases control',()=>{
 const g=setup(),p=g.player,[a,b]=illusion(g,p,2,3,33,300);g.selectEntity(a.id);assert.equal(g.controlledUnit,a);const before=[p.x,p.y,b.x,b.y];g.unitCommand(a.id,'setMovement',[1,0]);g.step(.5);g.unitCommand(a.id,'setMovement',[0,0]);assert.ok(a.x>p.x);assert.deepEqual([p.x,p.y,b.x,b.y],before);
 const x=a.x;g.unitCommand(a.id,'stop');g.step(.5);assert.equal(a.x,x);g.step(3);assert.equal(a.dead,true);assert.equal(g.controlledUnit,p);
});
test('weak illusion attacks inherit hero critical passive and item critical passive without active buffs',()=>{
 const g=setup();equip(g,['greater_crit','armlet']);const p=g.player;p.inventoryMeta[1].mode='on';p.inventoryMeta[1].armletStrength=25;g._refreshHero(p);p.statuses.activeBoost={until:100,startedAt:0,attackSpeed:900,phased:true};const c=illusion(g,p,1,60,33,300)[0];
 assert.equal(c.inventoryMeta[1].mode,'off');assert.equal(c.statuses.activeBoost,undefined);assert.ok(c.maxHp<p.maxHp);assert.equal(g.skill(2,c).level,4);
 const target=g._unit('creep',1,c.x+100,c.y,{maxHp:100000,speed:0});g.entities.push(target);g._index();g._random=()=>0;g._attack(c,target);const text=g.effects.find(e=>e.type==='text'&&e.text.endsWith('!'));assert.ok(text,'hero critical should still fire');assert.ok(target.hp<target.maxHp);assert.equal(p.cooldowns[2],0);
});
test('weak illusions without a hero critical passive still proc item critical and lifesteal',()=>{
 const g=setup('axe');equip(g,['greater_crit','lifesteal']);const c=illusion(g,g.player,1,60,33,300)[0],target=g._unit('creep',1,c.x+100,c.y,{maxHp:10000,speed:0});g.entities.push(target);g._index();g._random=()=>0;c.hp=c.maxHp/2;const hp=c.hp;let result;const hit=g._hitAttack.bind(g);g._hitAttack=(h,t,r)=>{result=r;hit(h,t,r);};g._attack(c,target);assert.equal(result.itemCritical,true);assert.ok(c.hp>hp);
});
test('strong illusions mirror combat stats, mana and upgrades, and cast skills/items independently',()=>{
 for(const hero of ['juggernaut','crystal_maiden','windranger','axe','ogre_magi','kunkka','drow_ranger']){
  const g=setup(hero);equip(g,['phase_boots','ultimate_scepter']);const p=g.player,c=illusion(g,p,1,30,33,300,{type:'strong'})[0];assert.equal(strongIllusion(c),true);assert.equal(c.illusionOutgoing,1);assert.equal(c.illusionIncoming,1);
  for(const key of ['damage','armor','speed','maxHp','maxMana','strength','agility','intelligence','range','attackSpeed'])assert.equal(c[key],p[key],hero+' '+key);assert.equal(c.mana,p.mana);assert.equal(c.hasScepter,p.hasScepter);assert.equal(g.unitCommand(c.id,'useItem',[0,c,'inventory']).ok,true);assert.equal(p.inventoryMeta[0].cooldownRemaining,0);
 }
 const g=setup('crystal_maiden'),p=g.player,c=illusion(g,p,1,30,33,300,{type:'strong'})[0],enemy=g._unit('creep',1,c.x+100,c.y,{maxHp:10000,speed:0});g.entities.push(enemy);g._creepTick=()=>{};g._chooseTarget=()=>null;g._index();const mana=c.mana;assert.equal(g.unitCommand(c.id,'cast',[0,enemy]).ok,true);g.step(.6);assert.ok(enemy.hp<enemy.maxHp);assert.ok(c.mana<mana);assert.ok(c.cooldowns[0]>0);assert.equal(p.cooldowns[0],0);
});
test('server validates ownership, lifetime, nested args and copied-item slot guards for each human',()=>{
 const members=['juggernaut','crystal_maiden'].map((heroId,i)=>({heroId,clientId:'human-'+i,name:'Human '+i})),g=new CoopGame(members,{fillWithAI:true}),humans=g.entities.filter(e=>e.isHuman),a=humans[0],b=humans[1];g.withActor(a.id,()=>equip(g,['phase_boots']));const own=illusion(g,a,1,60,33,300,{type:'strong'})[0],foreign=illusion(g,b,1,60,33,300)[0];
 const cmd=(unit,action,args=[],slotGuards=[])=>({type:'command',id:'req',action:'unitCommand',args:[unit.id,action,args],slotGuards});
 assert.equal(executeCommand(g,a.id,cmd(foreign,'moveTo',[7000,7000])).ok,false);assert.equal(executeCommand(g,a.id,cmd(own,'moveTo',[7000,7000])).ok,true);assert.equal(executeCommand(g,b.id,cmd(own,'stop')).ok,false);assert.equal(executeCommand(g,a.id,cmd(own,'buy',['rapier'])).ok,false);assert.equal(executeCommand(g,a.id,cmd(own,'moveTo',[Infinity,0])).ok,false);
 assert.equal(executeCommand(g,a.id,cmd(own,'useItem',[0,{x:own.x,y:own.y,self:true},'inventory'])).ok,false);assert.equal(executeCommand(g,a.id,cmd(own,'useItem',[0,{x:own.x,y:own.y,self:true},'inventory'],[{area:'inventory',index:0,uid:own.inventoryMeta[0].uid}])).ok,true);assert.equal(a.inventoryMeta[0].cooldownRemaining,0);own.dead=true;assert.equal(executeCommand(g,a.id,cmd(own,'stop')).ok,false);assert.equal(g._commandActor,undefined);
});
test('saving/restoring preserves illusion class, ownership, equipment and manual orders without fake item drops',()=>{
 const g=setup();equip(g,['rapier']);const c=illusion(g,g.player,1,30,33,300,{type:'strong'})[0];g.unitCommand(c.id,'moveTo',[6500,6000]);g.selectEntity(c.id);const restored=restoreMatch(parseMatch(serializeMatch(g,0))),copy=restored.entities.find(e=>e.id===c.id);assert.equal(restored.canControl(copy),true);assert.equal(strongIllusion(copy),true);assert.deepEqual(copy.destination,c.destination);restored.setPaused(false);restored._kill(copy,null);assert.equal(restored.entities.filter(e=>e.kind==='droppedItem').length,0);assert.ok(restored.player.inventory.includes('rapier'));
});
test('legacy saved illusions acquire independent passives and stop inherited automatic orders on restore',()=>{
 const g=setup();equip(g,['greater_crit']);const p=g.player,legacy=g._unit('illusion',p.team,p.x+50,p.y+35,{heroId:p.heroId,name:p.name+'幻象',ownerId:p.id,level:p.level,maxHp:p.maxHp,maxMana:0,mana:0,range:p.range,inventory:[],cooldowns:[],expiresAt:30,illusionOutgoing:.33,illusionIncoming:3,controlTarget:'old-target'});g.entities.push(legacy);g.selectedId=legacy.id;const restored=restoreMatch(parseMatch(serializeMatch(g,0))),c=restored.selected;assert.equal(c.id,legacy.id);assert.equal(weakIllusion(c),true);assert.deepEqual(c.abilityLevels,p.abilityLevels);assert.equal(c.inventory[0],'greater_crit');assert.equal(c.inventoryMeta[0].ownerId,c.id);assert.equal(c.explicitTarget,null);assert.deepEqual(c.movementInput,{x:0,y:0});restored.setPaused(false);restored.step(.2);assert.ok(Number.isFinite(c.hp));
});
test('weak illusions retain Drow marksmanship, innate agility and passive item auras but cannot fire Frost Arrows',()=>{
 const g=setup('drow_ranger');equip(g,['vladmir']);g._chooseTarget=()=>null;const p=g.player,c=illusion(g,p,1,30,33,300)[0],target=g._unit('creep',1,c.x+200,c.y,{maxHp:10000,speed:0});g.entities.push(target);g._creepTick=()=>{};g._random=()=>0;g.step(.3);
 assert.equal(marksmanshipActive(g,c),true);assert.ok(c.trueshotAgility>0);assert.ok(c.itemAura.lifesteal>0);c.autocast[0]=true;c.mana=1000;const result=attackModifiers(g,c,target);assert.equal(result.marksmanship,true);assert.equal(result.frostArrow,undefined);
 const enemyHero=g._makeHero('axe',1,1,false,8);Object.assign(enemyHero,{x:c.x+100,y:c.y});assert.equal(marksmanshipActive(g,c),false);
});
test('strong illusion item cooldowns tick independently and copied Radiance can be switched off',()=>{
 const g=setup();equip(g,['phase_boots','radiance']);const p=g.player,c=illusion(g,p,1,30,33,300,{type:'strong'})[0];g._chooseTarget=()=>null;g.unitCommand(c.id,'useItem',[0,c,'inventory']);const cooldown=c.inventoryMeta[0].cooldownRemaining;g.step(1);assert.ok(c.inventoryMeta[0].cooldownRemaining<cooldown);assert.equal(p.inventoryMeta[0].cooldownRemaining,0);
 const target=g._unit('creep',1,c.x+100,c.y,{maxHp:10000,speed:0});g.entities=[c,target];g._creepTick=()=>{};c.inventoryMeta[1].mode='off';g.step(.3);assert.equal(target.hp,target.maxHp);
});
test('illusion attacks credit owner last hits, gold, kills and assists without giving foreign copied items ownership',()=>{
 const g=setup();equip(g,['greater_crit']);const p=g.player;p.inventoryMeta[0].ownerId='other-hero';g._refreshHero(p);const c=illusion(g,p,1,30,33,300)[0];assert.equal(c.inventoryMeta[0].ownerId,'other-hero');assert.equal(g.itemState(0,'inventory',c).active,false);assert.equal(c.damage,p.damage);
 const gold=p.gold,creep=g._unit('creep',1,6000,6000,{maxHp:10,goldMin:40,goldMax:40,xpBounty:50});g.entities.push(creep);g._kill(creep,c);assert.equal(p.lastHits,1);assert.equal(p.gold,gold+40);
 const enemy=g._makeHero('axe',1,1,false,3);enemy.hp=1;g.damage(enemy,100,c,'pure');assert.equal(p.kills,1);assert.ok(enemy.lastDamagers[p.id]>=0);assert.equal(p.assists,0);
});
