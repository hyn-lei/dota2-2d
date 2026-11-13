import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {Navigator} from '../src/navigation.js';
import {BASES} from '../src/map-data.js';
import {createIllusions} from '../src/illusions.js';
import {createMeta} from '../src/inventory.js';
import {ITEM_BY_ID} from '../src/item-data.js';
import * as Skills from '../src/hero-runtime.js';
import {parseMatch,serializeMatch,restoreMatch} from '../src/game-save.js';

function arena(hero='juggernaut'){
 const g=new Game({hero});g.entities=[g.player];
 g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 g.navigation=new Navigator({cols:160,rows:160,cellSize:64,blocked:'0'.repeat(25600)},[]);
 Object.assign(g.player,{x:6000,y:6000,level:15,abilityLevels:[4,4,4,2],talents:[],skillPoints:0,talentPoints:0});
 g._refreshHero(g.player);g.player.mana=g.player.maxMana;
 g._chooseTarget=()=>null;
 g._creepTick=g._neutralTick=g._towerTick=()=>{};
 return g;
}
function hostile(g,kind,x,y){
 const unit=g._unit(kind,kind==='neutral'?2:1,x,y,{maxHp:100000,hitsRemaining:100000,speed:0,damage:0,radius:16,tier:1,
  heroId:'axe',level:1,abilityLevels:[0,0,0,0],cooldowns:[0,0,0,0],aiTimer:Infinity,expiresAt:Infinity});
 g.entities.push(unit);return unit;
}
function ally(g,hero,x,y){
 const h=g._makeHero(hero,0,1,false,0);
 Object.assign(h,{x,y,level:25,abilityLevels:[4,4,4,3],talents:[],aiTimer:Infinity,skillPoints:0,talentPoints:0});
 g._refreshHero(h);h.mana=h.maxMana;return h;
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

for(const kind of ['hero','creep','neutral','illusion','summon','ward','courier','tower'])test(`weak illusions automatically acquire nearby hostile ${kind} units`,()=>{
 const g=arena(),c=createIllusions(g,g.player,1,60,33,300)[0];
 const enemy=hostile(g,kind,c.x-80,c.y);g._index();g._playerTick(c,.05);
 assert.equal(c.targetId,enemy.id);assert.equal(c.explicitTarget,null);
 assert.ok(enemy.hp<enemy.maxHp,'automatic targeting must release a real attack');
});

test('weak illusions acquire at 600 center units but not beyond 600 even for large targets',()=>{
 for(const d of [600,600.01]){
  const g=arena(),c=createIllusions(g,g.player,1,60,33,300)[0];
  const enemy=hostile(g,'neutral',c.x-d,c.y);enemy.radius=80;g._index();
  const before=c.x;g._playerTick(c,.05);
  assert.equal(c.targetId,d===600?enemy.id:null);
  if(d>600)assert.equal(c.x,before);
 }
});

test('weak illusions chase and damage unprovoked neutrals independently of their moving owner',()=>{
 const g=arena(),p=g.player,c=createIllusions(g,p,1,60,33,300)[0];
 const enemy=hostile(g,'neutral',c.x-400,c.y),before=c.x;
 assert.equal(enemy.targetId,null);g.moveTo(6800,6000);g.step(1.5);
 assert.ok(p.x>6200);assert.ok(c.x<before-150);assert.ok(enemy.hp<enemy.maxHp);
 assert.equal(c.targetId,enemy.id);assert.equal(c.explicitTarget,null);
});

for(const team of [0,1])test(`team ${team} weak-illusion automatic pursuit walks around a blocked friendly formation`,()=>{
 const g=arena(),p=g.player,dir=team===0?1:-1;p.team=team;
 g.navigation=new Navigator({cols:100,rows:100,cellSize:32,blocked:'0'.repeat(10000)},[]);
 const c=createIllusions(g,p,1,60,33,300)[0];Object.assign(c,{x:1000,y:1000});
 const blockers=[[64,0],[64,-40],[64,40],[0,-48],[32,-48],[0,48],[32,48]]
  .map(([x,y])=>g._unit('creep',team,1000+x*dir,1000+y,{radius:16,speed:0,maxHp:10000}));
 const enemy=hostile(g,'creep',1000+450*dir,1000);enemy.team=1-team;g.entities=[c,...blockers,enemy];
 for(let frame=0;frame<160;frame++){
  g.time+=.05;g._index();c.attackCooldown=Math.max(0,c.attackCooldown-.05);
  const before={x:c.x,y:c.y};g._playerTick(c,.05);
  assert.ok(Math.hypot(c.x-before.x,c.y-before.y)<=g.combatStats(c).speed*.05+.01,'pursuit must walk rather than teleport');
  for(const b of blockers)assert.ok(Math.hypot(c.x-b.x,c.y-b.y)>=c.collisionRadius+b.collisionRadius-.001,'pursuit must preserve body blocking');
 }
 assert.ok(enemy.hp<enemy.maxHp,`automatic pursuit stayed trapped at ${c.x},${c.y}`);
 assert.equal(c.targetId,enemy.id);assert.equal(c.explicitTarget,null);
});

test('weak illusions retain a valid automatic target and reacquire after death or leaving their radius',()=>{
 const g=arena(),c=createIllusions(g,g.player,1,60,33,300)[0];c.attackCooldown=999;
 const first=hostile(g,'creep',c.x-100,c.y),second=hostile(g,'neutral',c.x+180,c.y);
 g._index();g._playerTick(c,0);assert.equal(c.targetId,first.id);
 second.x=c.x+70;g._index();g._playerTick(c,0);assert.equal(c.targetId,first.id);
 first.x=c.x-601;g._index();g._playerTick(c,0);assert.equal(c.targetId,second.id);
 second.dead=true;g._index();g._playerTick(c,0);assert.equal(c.targetId,null);
});

test('automatic acquisition excludes allies, ground items, invulnerable, invisible and protected units',()=>{
 const g=arena(),c=createIllusions(g,g.player,1,60,33,300)[0];
 const friend=hostile(g,'creep',c.x-50,c.y);friend.team=c.team;
 hostile(g,'droppedItem',c.x-60,c.y);
 const hidden=hostile(g,'creep',c.x-70,c.y);Skills.addStatus(g,hidden,'invisible',{duration:10,invisible:true});
 const invulnerable=hostile(g,'creep',c.x-90,c.y);Skills.addStatus(g,invulnerable,'invulnerable',{duration:10,invulnerable:true});
 hostile(g,'fountain',c.x-110,c.y);
 const valid=hostile(g,'neutral',c.x-200,c.y);g._index();g._playerTick(c,0);
 assert.equal(c.targetId,valid.id);
});

test('manual movement and attack orders take priority over weak-illusion automatic targeting',()=>{
 const g=arena(),c=createIllusions(g,g.player,1,60,33,300)[0];
 const near=hostile(g,'creep',c.x-80,c.y),far=hostile(g,'neutral',c.x-900,c.y),before=c.x;
 g.unitCommand(c.id,'setMovement',[0,1]);g.step(.2);assert.equal(c.targetId,null);assert.equal(near.hp,near.maxHp);
 g.unitCommand(c.id,'setMovement',[0,0]);g.unitCommand(c.id,'moveTo',[c.x+500,c.y]);g.step(.2);
 assert.ok(c.x>before);assert.equal(c.targetId,null);assert.equal(near.hp,near.maxHp);
 g.unitCommand(c.id,'attackTarget',[far.id]);g.step(.05);assert.equal(c.targetId,far.id);
 g.unitCommand(c.id,'stop');assert.equal(c.targetId,null);assert.equal(c.explicitTarget,null);
 g.step(.05);assert.equal(c.targetId,near.id,'an idle weak illusion resumes automatic acquisition');
});

for(const controller of ['human','ai'])test(`${controller} owners do not give strong illusions automatic or inherited attack orders`,()=>{
 const g=arena(),p=g.player;const enemy=hostile(g,'creep',p.x-130,p.y+35);
 p.controller=controller;p.targetId=p.explicitTarget=enemy.id;
 const c=createIllusions(g,p,1,60,33,300,{type:'strong'})[0],start={x:c.x,y:c.y};
 g._index();g._playerTick(c,.1);
 assert.equal(c.explicitTarget,null);assert.equal(c.targetId,null);assert.deepEqual({x:c.x,y:c.y},start);
 assert.equal(enemy.hp,enemy.maxHp);
 assert.equal(g.unitCommand(c.id,'attackTarget',[enemy.id]).ok,true);g._playerTick(c,.1);assert.ok(enemy.hp<enemy.maxHp);
});

test('weak illusions acquire their own nearby target instead of inheriting an AI owner target outside 600',()=>{
 const g=arena(),p=g.player;p.controller='ai';
 const far=hostile(g,'creep',p.x-1500,p.y);p.targetId=far.id;
 const c=createIllusions(g,p,1,60,33,300)[0],near=hostile(g,'neutral',c.x-80,c.y);
 g._index();g._playerTick(c,.05);assert.equal(c.explicitTarget,null);assert.equal(c.targetId,near.id);
});

for(const type of ['weak','strong'])test(`${type} illusions snapshot current beneficial skills, talents and buff lifetimes independently`,()=>{
 const g=arena('ogre_magi'),p=g.player;p.talents=[2,3];g._refreshHero(p);p.mana=p.maxMana;g._random=()=>.99;
 assert.equal(g._cast(p,2,p).ok,true);g.step(.5);
 const c=createIllusions(g,p,1,60,33,300,{type})[0],buff=p.statuses.ogreBloodlust;
 assert.deepEqual(c.talents,p.talents);assert.notEqual(c.talents,p.talents);
 assert.deepEqual(c.statuses.ogreBloodlust,buff);assert.notEqual(c.statuses.ogreBloodlust,buff);
 close(g.combatStats(c).attackSpeed,g.combatStats(p).attackSpeed);
 const saved=c.statuses.ogreBloodlust.attackSpeed;
 buff.attackSpeed+=100;buff.until+=10;p.talents.push(4);p.abilityLevels[2]=1;g._refreshHero(p);
 assert.equal(c.statuses.ogreBloodlust.attackSpeed,saved);assert.ok(c.statuses.ogreBloodlust.until<buff.until);
 assert.deepEqual(c.talents,[2,3]);assert.equal(c.abilityLevels[2],4);
 Skills.addStatus(g,p,'laterBoost',{positive:true,duration:20,armor:20});assert.equal(c.statuses.laterBoost,undefined);
 g.time=c.statuses.ogreBloodlust.until;Skills.tickStatuses(g,c,0);assert.equal(c.statuses.ogreBloodlust,undefined);
});

for(const type of ['weak','strong'])test(`${type} illusions receive allied and owner Bloodlust with the caster's talent enhancement`,()=>{
 const g=arena('ogre_magi'),p=g.player,c=createIllusions(g,p,1,60,33,300,{type})[0];g._random=()=>.99;
 const caster=ally(g,'ogre_magi',c.x-200,c.y);caster.talents=[3];g._refreshHero(caster);caster.mana=caster.maxMana;
 const base=g.combatStats(c);assert.equal(g._cast(caster,2,c).ok,true);g.step(.5);
 const expected=Skills.skillOf(caster,2).values.bonus_attack_speed;
 assert.equal(c.statuses.ogreBloodlust.attackSpeed,expected);assert.equal(c.statuses.ogreBloodlust.sourceId,caster.id);
 assert.ok(g.combatStats(c).attackSpeed>base.attackSpeed);assert.ok(g.combatStats(c).speed>base.speed);
 p.talents=[3];g._refreshHero(p);p.mana=p.maxMana;assert.equal(g._cast(p,2,c).ok,true);g.step(.5);
 assert.equal(c.statuses.ogreBloodlust.sourceId,p.id);assert.equal(c.statuses.ogreBloodlust.attackSpeed,expected);
 assert.deepEqual(c.talents,[],'being buffed does not copy the caster talent tree');
});

for(const type of ['weak','strong'])test(`${type} illusions receive Ghostship Rum, including its caster talent area bonus`,()=>{
 for(const bonus of [false,true]){
  const g=arena('kunkka'),p=g.player;p.level=25;p.talents=bonus?[6]:[];g._refreshHero(p);p.mana=p.maxMana;
  const c=createIllusions(g,p,1,60,33,300,{type})[0],width=Skills.skillOf(p,3).values.ghostship_width;
  Object.assign(c,{x:p.x,y:p.y+width+50,speed:0});
  assert.equal(g._cast(p,3,{x:p.x+100,y:p.y}).ok,true);g.step(4.5);
  assert.equal(!!c.statuses.rum,bonus);
  if(bonus){
   assert.equal(c.statuses.rum.sourceId,p.id);c.speed=100;
   close(g.combatStats(c).speed,100*(1+c.statuses.rum.movePercent/100));
   const hp=c.hp,absorb=c.statuses.rum.absorb;
   g.damage(c,100,null,'pure');close(hp-c.hp,100*(type==='weak'?3:1)*(1-absorb));
  }
 }
});

for(const type of ['weak','strong'])test(`${type} illusions receive allied healing wards and ranged agility/mana auras`,()=>{
 const g=arena('crystal_maiden'),p=g.player,c=createIllusions(g,p,1,60,33,300,{type})[0];
 const drow=ally(g,'drow_ranger',c.x-200,c.y),juggernaut=ally(g,'juggernaut',c.x+200,c.y);
 assert.equal(g._cast(juggernaut,1,c).ok,true);g.step(.5);
 assert.ok(c.trueshotAgility>0);assert.ok(drow.agility>0);
 c.hp=c.maxHp/2;c.hpRegen=0;const hp=c.hp;
 g.step(1);assert.ok(c.hp>hp+c.maxHp*.01,'the healing ward must heal the illusion');
 const mana=Skills.auraManaSources(g,c);assert.ok(mana.some(source=>source.sourceId===p.id));
});

for(const type of ['weak','strong'])test(`${type} illusions keep their skill/talent snapshot after the owner learns new ranks`,()=>{
 const g=arena('ogre_magi'),p=g.player;p.abilityLevels=[1,1,1,0];p.skillPoints=p.talentPoints=1;g._refreshHero(p);
 const c=createIllusions(g,p,1,60,33,300,{type})[0],damage=c.damage;
 assert.equal(g.learnAbility(2).ok,true);assert.equal(g.learnTalent(2).ok,true);
 assert.equal(Skills.skillOf(p,2).level,2);assert.ok(p.damage>damage);
 assert.equal(Skills.skillOf(c,2).level,1);assert.equal(c.damage,damage);assert.deepEqual(c.talents,[]);
});

for(const type of ['weak','strong'])test(`${type} illusions keep BKB components when a courier delivers the owner's later purchase`,()=>{
 const g=new Game({hero:'crystal_maiden'}),p=g.player;g.entities=g.entities.filter(e=>e===p||e.ownerId===p.id);
 g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 Object.assign(p,{x:BASES[0].x+600,y:BASES[0].y-1600,inventory:['mithril','ogreaxe'],gold:ITEM_BY_ID.recipe_black_king_bar.cost-10});
 p.inventoryMeta=p.inventory.map(id=>createMeta(p,id));g._refreshHero(p);
 const c=createIllusions(g,p,1,60,33,300,{type})[0],components=c.inventory.filter(Boolean),strength=c.strength,damage=c.damage;
 assert.equal(g.buy('recipe_black_king_bar').ok,false);g.step(6.1);
 assert.equal(g.buy('recipe_black_king_bar').ok,true);assert.equal(g.courierCommand('deliver').ok,true);g.step(30);
 assert.ok(p.inventory.includes('black_king_bar'));assert.deepEqual(c.inventory.filter(Boolean),components);
 assert.equal(c.strength,strength);assert.equal(c.damage,damage);assert.equal(c.inventory.includes('black_king_bar'),false);
});

test('save restoration preserves independent buff/equipment snapshots and weak-versus-strong targeting',()=>{
 const g=arena('ogre_magi'),p=g.player;Skills.addStatus(g,p,'snapshotArmor',{positive:true,duration:30,armor:12});
 const weak=createIllusions(g,p,1,60,33,300)[0],strong=createIllusions(g,p,1,60,33,300,{type:'strong'})[0];
 Object.assign(strong,{x:weak.x+200,y:weak.y});Skills.addStatus(g,p,'laterBuff',{positive:true,duration:30,attackSpeed:80});
 const enemy=hostile(g,'creep',weak.x-80,weak.y);
 const restored=restoreMatch(parseMatch(serializeMatch(g,0)));restored.setPaused(false);restored._creepTick=()=>{};restored.step(.05);
 const a=restored.entities.find(e=>e.id===weak.id),b=restored.entities.find(e=>e.id===strong.id);
 for(const c of [a,b]){assert.equal(c.statuses.snapshotArmor.armor,12);assert.equal(c.statuses.laterBuff,undefined);assert.notEqual(c.statuses.snapshotArmor,restored.player.statuses.snapshotArmor);}
 assert.equal(a.targetId,enemy.id);assert.equal(b.targetId,null);
});
