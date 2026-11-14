import {weakIllusion} from './illusions.js';
import * as Skills from './hero-runtime.js';

const controllable=new Set(['illusion','summon','neutral','creep']);
export const ownsControlledUnit=(owner,unit)=>!!owner&&!!unit&&controllable.has(unit.kind)&&unit.ownerId===owner.id&&unit.team===owner.team;
export const ownedUnits=(game,owner)=>game.entities.filter(unit=>ownsControlledUnit(owner,unit)&&!unit.dead&&unit.hp>0);
export const isControlledCreature=unit=>!!unit?.ownerId&&['summon','neutral','creep'].includes(unit.kind);
export function setCreatureOrder(unit,mode){
 if(!unit?.zealot)return;
 unit.creatureOrder=mode;unit.huntTargetId=null;
 if(mode==='hold'){unit.explicitTarget=null;unit.targetId=null;}
}
function zealotTick(game,unit,owner,dt){
 let mode=unit.creatureOrder||'follow';
 if(mode==='hold'){
  const input=unit.movementInput||{};
  if(input.x||input.y)game._move(unit,{x:unit.x+input.x*100,y:unit.y+input.y*100},dt);
  else if(unit.destination){game._move(unit,unit.destination,dt);if(Math.hypot(unit.x-unit.destination.x,unit.y-unit.destination.y)<3)unit.destination=null;}
  return;
 }
 const valid=target=>target&&!target.dead&&target.hp>0&&target.team!==unit.team&&game.canSee(unit,target)&&!Skills.isInvulnerable(game,target)&&!game.isProtected(target);
 let target;
 if(mode==='follow'&&owner?.explicitTarget){const enemy=game.entities.find(e=>e.id===owner.explicitTarget);if(valid(enemy)){unit.explicitTarget=enemy.id;unit.creatureOrder=mode='attack';}}
 if(mode==='attack'){
  target=game.entities.find(e=>e.id===unit.explicitTarget);
  if(!valid(target)){unit.explicitTarget=null;unit.targetId=null;unit.creatureOrder=mode='hunt';target=null;}
 }
 if(mode==='hunt'){
  target=game.entities.find(e=>e.id===unit.huntTargetId);
  if(!valid(target)){
   target=game.entities.filter(e=>valid(e)&&['hero','illusion','creep','neutral','summon','tower','barracks','ancient','filler'].includes(e.kind)&&Math.hypot(e.x-unit.x,e.y-unit.y)<=600)
    .sort((a,b)=>Math.hypot(a.x-unit.x,a.y-unit.y)-Math.hypot(b.x-unit.x,b.y-unit.y))[0];
   unit.huntTargetId=target?.id||null;
  }
  if(!target){unit.creatureOrder=mode='follow';unit.targetId=null;}
 }
 if(target){
  unit.targetId=target.id;game._controlledAbility(unit,target);
  if(!unit.neutralCast&&!game._attack(unit,target))game._move(unit,target,dt,unit.range+(target.radius||0)-3);
 }else if(owner&&!owner.dead&&owner.hp>0&&Math.hypot(unit.x-owner.x,unit.y-owner.y)>130)game._move(unit,owner,dt,110);
}
export function controlUnit(game,unit,dt){
 if(unit.expiresAt&&unit.expiresAt<=game.time&&!unit.dead){game._kill(unit,null);return;}
 if(unit.dead||unit.hp<=0||game.isStunned(unit)||unit.forcedMotion||unit.itemChannel||unit.neutralCast||unit.neutralChannel)return;
 if(game._tauntedTick(unit,dt))return;
 const owner=game.entities.find(h=>h.id===unit.ownerId),manual=unit.manualControl;
 if(unit.zealot){zealotTick(game,unit,owner,dt);return;}
 if(!manual){
  const target=game.entities.find(e=>e.id===(owner?.explicitTarget||unit.controlTarget)&&!e.dead&&e.hp>0)||game._chooseTarget(unit,700);
  if(target){unit.targetId=target.id;game._controlledAbility(unit,target);if(!game._attack(unit,target))game._move(unit,target,dt,unit.range+target.radius-3);}
  else if(owner&&!owner.dead&&Math.hypot(unit.x-owner.x,unit.y-owner.y)>180)game._move(unit,owner,dt,130);
 }else {game._controlledAbility(unit,null);if(!unit.neutralCast)game._playerTick(unit,dt);}
}
export const creatureCanUseItems=unit=>!isControlledCreature(unit)&&!weakIllusion(unit);
