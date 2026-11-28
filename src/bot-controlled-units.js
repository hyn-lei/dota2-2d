import {BASES} from './map-data.js';
import {isControlledCreature,ownsControlledUnit} from './controlled-units.js';
import {botProfile} from './bot-difficulty.js';
import {tacticalWorld} from './bot-tactics.js';
import {isInvulnerable} from './hero-runtime.js';

const plans=new WeakMap();
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=u=>u&&!u.dead&&u.hp>0;
const attackable=(game,unit,target)=>game.canSee(unit,target)&&alive(target)&&target.team!==unit.team&&
 !target.attackImmune&&!game.isProtected(target)&&!isInvulnerable(game,target);

function issueOrder(game,owner,unit,action,args){
 const previous=game._commandActor;
 game._commandActor=owner;
 try{return game.unitCommand(unit.id,action,args).ok;}
 finally{game._commandActor=previous;}
}

export function tickBotUnits(game,owner){
 if(botProfile(game,owner).tier<3)return;
 let plan=plans.get(owner);
 if(!plan){plan={next:0,assigned:new Map()};plans.set(owner,plan);}
 for(const [unit,order] of plan.assigned){
  if(!alive(unit)||!ownsControlledUnit(owner,unit)){plan.assigned.delete(unit);continue;}
  if(!alive(owner)){
   issueOrder(game,owner,unit,'stop',[]);plan.assigned.delete(unit);
  }else if(order.target&&!attackable(game,unit,order.target)){
   issueOrder(game,owner,unit,'stop',[]);plan.assigned.delete(unit);plan.next=0;
  }
 }
 if(!alive(owner)||game.time<plan.next&&game.time>=plan.next-.35)return;
 plan.next=game.time+.35;
 const world=tacticalWorld(game),assigned=new Set();
 const units=world.teams[owner.team].units.filter(unit=>alive(unit)&&ownsControlledUnit(owner,unit));
 for(const unit of units){
  if(unit.neutralCast||unit.neutralChannel||unit.castPhase||unit.forcedMotion)continue;
  if((isControlledCreature(unit)&&unit.hp/unit.maxHp<.35)||distance(unit,owner)>2200){
   const base=BASES[owner.team],d=distance(base,owner)||1;
   const point={x:owner.x+(base.x-owner.x)/d*350,y:owner.y+(base.y-owner.y)/d*350};
   const old=plan.assigned.get(unit)?.point;
   if((!old||distance(point,old)>130)&&issueOrder(game,owner,unit,'moveTo',[point.x,point.y]))plan.assigned.set(unit,{point});
   continue;
  }
  let target=null,best=Infinity;
  for(const e of game._near(unit,900)){
   if(!attackable(game,unit,e)||e.team===2||!['hero','creep','illusion','summon','tower','barracks','ancient'].includes(e.kind))continue;
   const score=distance(e,unit)-(e.kind==='hero'?380:0)+(assigned.has(e.id)?430:0)-(owner.targetId===e.id?80:0);
   if(score<best){best=score;target=e;}
  }
  if(!target)continue;
  if(unit.explicitTarget!==target.id&&!issueOrder(game,owner,unit,'attackTarget',[target.id]))continue;
  assigned.add(target.id);plan.assigned.set(unit,{target});
  if(isControlledCreature(unit))game._controlledAbility(unit,target);
 }
}
