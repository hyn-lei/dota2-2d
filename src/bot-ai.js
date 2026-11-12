import { BASES, TEAM_LANES } from './map-data.js';
import * as Skills from './hero-runtime.js';
import * as Progression from './progression.js';
import * as Inventory from './inventory.js';
import * as ItemRuntime from './item-runtime.js';
import { physicalDamageMultiplier } from './hero-stats.js';
import { tickBotShopping } from './bot-items.js';
import { ITEM_BY_ID } from './item-data.js';
import {tacticalWorld,tacticalPlan,trySupportTeleport,safeStandPoint,fightingPower} from './bot-tactics.js';

export const BOT_DIFFICULTY=Object.freeze({
  easy:{reaction:.35,jitter:.06,awareness:1100,lead:.45,advantage:1.85},
  normal:{reaction:.18,jitter:.035,awareness:1250,lead:.75,advantage:1.65},
  hard:{reaction:.08,jitter:.015,awareness:1450,lead:1,advantage:1.5},
  nightmare:{reaction:.03,jitter:.005,awareness:2000,lead:1.15,advantage:1.3}
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=e=>e&&!e.dead&&e.hp>0;
const fighter=e=>['hero','creep','neutral','illusion','summon'].includes(e?.kind);
export const botProfile=(g,h)=>BOT_DIFFICULTY[h.team===1?g.difficulty:h.aiDifficulty==='hard'?'hard':'normal']||BOT_DIFFICULTY.normal;
const has=(g,h,id)=>h.statuses?.[id]?.until>g.time;
const controlled=(g,h)=>g.isStunned(h)||g.isRooted(h);
const nightmare=(g,h)=>h.team===1&&g.difficulty==='nightmare';
// Server matches opt into nightmare. Keep plans out of entities/snapshots and
// rebuild the team view once per 200 ms, rather than once per hero per frame.
const directors=new WeakMap();
function director(g){
  let state=directors.get(g);
  if(!state){state={nextAt:0,plans:new Map(),controls:[]};directors.set(g,state);}
  if(g.time<state.nextAt)return state;
  state.nextAt=g.time+.2;
  const world=tacticalWorld(g),bots=world.teams[1].bots,humans=world.teams[1].visibleHeroes;
  const structures=world.structures,fighters=world.fighters;state.entities=world.entities;
  const previous=state.plans;state.plans=new Map();
  const remaining=new Set(bots);
  while(remaining.size){
    const squad=[remaining.values().next().value];remaining.delete(squad[0]);
    for(let i=0;i<squad.length;i++)for(const bot of remaining)if(distance(squad[i],bot)<=2800){squad.push(bot);remaining.delete(bot);}
    const visible=e=>squad.some(h=>distance(h,e)<=BOT_DIFFICULTY.nightmare.awareness&&g.canSee(h,e));
    let focus=null,focusScore=Infinity;
    for(const e of humans)if(visible(e)&&!g.isProtected(e)&&!Skills.isInvulnerable(g,e)){
      const nearby=squad.filter(h=>distance(h,e)<=2200),health=e.hp/e.maxHp;
      const unsafe=structures.some(t=>t.team===0&&t.kind==='tower'&&distance(t,e)<t.range&&!fighters.some(c=>c.team===1&&c.kind==='creep'&&distance(t,c)<t.range+50));
      const score=health*1100+nearby.reduce((n,h)=>n+distance(h,e),0)/nearby.length*.22-nearby.length*170-
        (controlled(g,e)?150:0)-(squad.some(h=>previous.get(h.id)?.focusId===e.id)?100:0)+(unsafe?1500:0);
      if(score<focusScore){focus=e;focusScore=score;}
    }
    for(const bot of squad){bot.teamFocusTargetId=focus?.id||null;state.plans.set(bot.id,{focusId:focus?.id||null});}
  }
  return state;
}
function controlWindow(h,s,target){
  const v=s.values||{},cast=Skills.castingStats(h,s).castPoint||0;
  const delay=s.id==='windrunner_shackleshot'?distance(h,target)/v.arrow_speed:s.id==='kunkka_torrent'?v.delay:s.id==='kunkka_ghostship'?v.ghostship_distance/v.ghostship_speed:0;
  return {delay:cast+delay,duration:v.stun_duration||v.duration||1};
}
function controlUntil(g,target,includeSilence=false){
  let until=Math.max(target.buffs?.stunUntil||0,target.buffs?.rootUntil||0,target.buffs?.tauntUntil||0);
  for(const s of Object.values(target.statuses||{}))if(s.startedAt<=g.time&&s.until>g.time&&
    (!s.suppressedByDebuffImmunity||!Skills.debuffImmune(g,target))&&
    (s.stunned||s.rooted||s.hex||['stun','root','taunt','hex'].includes(s.id)||includeSilence&&(s.silenced||s.silence||s.id==='silence')))until=Math.max(until,s.until);
  return until;
}
function canControl(g,h,target,window){
  if(!nightmare(g,h))return !controlled(g,target);
  if(!target||Skills.isInvulnerable(g,target)||Skills.debuffImmune(g,target))return false;
  const landing=g.time+window.delay,end=landing+window.duration*(1-Skills.statusResistance(g,target));
  if(controlUntil(g,target,window.silence)>landing+.06)return false;
  const state=director(g);
  state.controls=state.controls.filter(r=>r.landing+.12>g.time&&alive(r.source)&&
    (r.source.castPhase===r.phase||(r.extraId?r.source.extraCooldowns?.[r.extraId]:r.source.cooldowns[r.index])>0));
  const overlaps=r=>r.targetId===target.id&&landing<r.end-.06&&end>r.landing+.06;
  if(state.controls.some(overlaps))return false;
  // Real projectiles and Ogre multicasts can outlive the original cast phase.
  for(const spell of g.pendingSpells){
    const source=state.entities.get(spell.sourceId);
    if(source?.team!==h.team)continue;
    const direct=['shackle','ogre:fireblast'].includes(spell.type)&&spell.targetId===target.id;
    const area=['torrent','ship'].includes(spell.type)&&distance(spell,target)<(spell.type==='torrent'?spell.skill.values.radius:spell.skill.values.ghostship_width)+target.radius;
    if((direct||area)&&overlaps({targetId:target.id,landing:spell.landAt,end:spell.landAt+(spell.skill.values.stun_duration||.6)}))return false;
  }
  return true;
}
function reserveControl(g,h,target,window,index,extraId){
  if(!nightmare(g,h)||!target)return;
  director(g).controls.push({source:h,phase:h.castPhase,targetId:target.id,index,extraId,
    landing:g.time+window.delay,end:g.time+window.delay+window.duration*(1-Skills.statusResistance(g,target))});
}

export function maintainBot(g,h){
  if(h.isPlayer||h.isHuman||h.aiTimer===Infinity||g.paused||g.status!=='playing')return;
  if((h.skillPoints>0||h.talentPoints>0)&&g.time>=(h.botLearnAt||0)){Progression.autoLearn(h);g._refreshHero(h);h.botLearnAt=g.time+.5;}
  tickBotShopping(g,h);
}
function context(g,h,radius){
  const units=g._near(h,radius).filter(e=>g.canSee(h,e)),enemies=units.filter(e=>e.team!==h.team&&e.kind!=='droppedItem');
  const enemyHeroes=enemies.filter(e=>e.kind==='hero'&&!Skills.isInvulnerable(g,e));
  const allies=[h,...units.filter(e=>e.kind==='hero'&&e.team===h.team)];
  const towers=enemies.filter(e=>['tower','fountain'].includes(e.kind)&&distance(e,h)<e.range+420);
  const unsupported=towers.filter(t=>!tacticalWorld(g).teams[h.team].units.some(e=>e.kind==='creep'&&alive(e)&&distance(t,e)<t.range+50));
  return {units,enemies,enemyHeroes,allies,towers,unsupported,unsafeTower:unsupported[0],
    enemyPower:enemyHeroes.reduce((n,e)=>n+fightingPower(g,e),0),allyPower:allies.reduce((n,e)=>n+fightingPower(g,e),0)};
}
function retreatPoint(h,ctx){
  let x=0,y=0;
  for(const e of [...ctx.enemyHeroes,...ctx.towers]){const d=Math.max(80,distance(h,e)),weight=e.kind==='hero'?1:2;x+=(h.x-e.x)/d*weight;y+=(h.y-e.y)/d*weight;}
  const base=BASES[h.team],d=distance(h,base)||1;x+=(base.x-h.x)/d*.45;y+=(base.y-h.y)/d*.45;
  const length=Math.hypot(x,y)||1;return {x:h.x+x/length*450,y:h.y+y/length*450};
}
function badMatchup(g,h,e,ctx){
  return e.level>=h.level+2&&e.hp/e.maxHp>.32&&Math.max(ctx.enemyPower,fightingPower(g,e))>ctx.allyPower*1.25;
}
function safetyGoal(g,h,ctx,settings){
  const state=h.botState,old=state.safety;
  const strong=ctx.enemyHeroes.find(e=>badMatchup(g,h,e,ctx)&&distance(h,e)<Math.max(1100,e.range+500));
  const overwhelming=ctx.enemyHeroes.length>ctx.allies.length&&ctx.enemyPower>ctx.allyPower*settings.advantage;
  const threat=strong||(overwhelming?ctx.enemyHeroes.reduce((a,b)=>distance(h,a)<distance(h,b)?a:b):null);
  const tower=ctx.unsupported.find(t=>distance(h,t)<t.range+400);
  const mode=threat?'disengage':tower?'wait-wave':null,target=threat||tower;
  if(target){
    if(!old||old.mode!==mode||old.threatId!==target.id){
      state.safety={mode,threatId:target.id,goal:safeStandPoint(g,h,target),minUntil:g.time+3,clearSince:null};
    }else{
      old.clearSince=null;
      // Keep one retreat destination, unless the enemy moves into its safety margin.
      if(mode==='disengage'&&distance(old.goal,target)<Math.max(650,target.range+300)&&g.time>=(old.nextPointAt||0)){
        old.goal=safeStandPoint(g,h,target);old.nextPointAt=g.time+1.2;
      }
    }
  }else if(old){
    const remembered=tacticalWorld(g).entities.get(old.threatId);
    const stillUnsafe=alive(remembered)&&g.canSee(h,remembered)&&
      (old.mode==='wait-wave'?distance(h,remembered)<remembered.range+650&&
        !tacticalWorld(g).teams[h.team].units.some(c=>c.kind==='creep'&&alive(c)&&distance(c,remembered)<remembered.range+50):
        distance(h,remembered)<settings.awareness+250&&badMatchup(g,h,remembered,ctx));
    if(stillUnsafe)old.clearSince=null;
    else old.clearSince??=g.time;
    if(!alive(remembered)||old.clearSince!=null&&g.time>=old.minUntil&&g.time-old.clearSince>(old.mode==='wait-wave'?.5:1.2)){
      state.safety=null;state.nextMacroAt=0;state.goal=null;
    }
  }
  return state.safety;
}
export function chooseBotTarget(g,h,ctx){
  const safe=e=>!ctx.unsupported.some(t=>distance(t,e)<t.range+80)&&
    !(e.kind==='hero'&&badMatchup(g,h,e,ctx));
  if(nightmare(g,h)){
    const focus=ctx.enemyHeroes.find(e=>e.id===h.teamFocusTargetId&&alive(e)&&!g.isProtected(e)&&
      safe(e)&&!(h.botState?.ignoredTarget?.id===e.id&&h.botState.ignoredTarget.until>g.time));
    if(focus)return focus;
  }
  let best=null,bestScore=Infinity;
  for(const e of ctx.enemies){
    if(!alive(e)||g.isProtected(e)||Skills.isInvulnerable(g,e)||['fountain','filler','courier','droppedItem'].includes(e.kind))continue;
    if(!safe(e))continue;
    if(h.botState?.ignoredTarget?.id===e.id&&h.botState.ignoredTarget.until>g.time)continue;
    if(e.kind==='neutral'&&e.targetId!==h.id&&e.id!==h.farmTargetId)continue;
    const d=distance(h,e),stats=g.combatStats(h,e),lastHit=e.kind==='creep'&&e.hp<=stats.damage*physicalDamageMultiplier(e.armor||0)&&d<=h.range+e.radius+100;
    let score=d-(e.kind==='hero'?400:0)+(e.kind==='hero'?e.hp/e.maxHp*240:0);
    if(lastHit)score-=1200;
    if(e.kind==='hero'&&e.hp/e.maxHp<.28)score-=650;
    if(e.kind==='hero'&&controlled(g,e))score-=180;
    if(ctx.allies.some(a=>a!==h&&a.targetId===e.id))score-=180;
    if(e.id===h.focusTargetId)score-=500;
    if(e.id===h.botState?.targetId)score-=140;
    if(e.kind==='tower'||e.kind==='barracks'||e.kind==='ancient')score+=160;
    if(score<bestScore){best=e;bestScore=score;}
  }
  return best;
}
function predict(g,h,e,delay,settings){
  if(controlled(g,e))return {x:e.x,y:e.y};
  const state=h.botState,last=state.motion,dt=last?.id===e.id?g.time-last.time:0,speed=g.combatStats(e).speed;
  let vx=dt>.03?(e.x-last.x)/dt:0,vy=dt>.03?(e.y-last.y)/dt:0;
  const velocity=Math.hypot(vx,vy);if(velocity>speed){vx*=speed/velocity;vy*=speed/velocity;}
  state.motion={id:e.id,x:e.x,y:e.y,time:g.time};return {x:e.x+vx*delay*settings.lead,y:e.y+vy*delay*settings.lead};
}
function clusterPoint(g,h,ctx,range,radius){
  const candidates=ctx.enemies.filter(e=>fighter(e)&&distance(h,e)<=range&&!Skills.isInvulnerable(g,e));
  let best=null,score=0;
  for(const e of candidates){const weight=candidates.reduce((n,u)=>n+(distance(e,u)<=radius?(u.kind==='hero'?3:1):0),0);if(weight>score){best=e;score=weight;}}
  return {point:best,score};
}
function useItem(g,h,id,point=h){
  for(let i=0;i<h.inventory.length;i++)if(h.inventory[i]===id){const state=ItemRuntime.itemState(g,h,i);if(state.active&&state.cooldown<=0&&state.ready<=0&&ItemRuntime.useItem(g,h,i,point).ok)return true;}
  return false;
}
function useBotItems(g,h,target,ctx,retreating=false){
  const hp=h.hp/h.maxHp,mana=h.mana/h.maxMana,heroFight=ctx.enemyHeroes.length>0,d=target?distance(h,target):Infinity;
  if(!retreating&&!heroFight&&h.inventory.includes('hand_of_midas')){
    const food=ctx.enemies.filter(e=>['creep','neutral','summon'].includes(e.kind)&&!e.ancient&&!e.isRoshan).sort((a,b)=>(b.xpBounty||0)-(a.xpBounty||0));
    for(const unit of food)if(useItem(g,h,'hand_of_midas',unit))return true;
  }
  if(h.inventory.includes('moon_shard')&&!h.moonShard&&useItem(g,h,'moon_shard',h))return true;
  if((hp<.55||mana<.22)&&['magic_wand','magic_stick','holy_locket'].some(id=>{
    const i=h.inventory.indexOf(id);return i>=0&&(h.inventoryMeta[i]?.charges||0)>=3&&useItem(g,h,id,h);
  }))return true;
  if((hp<.65||ctx.allies.filter(a=>a.hp/a.maxHp<.7).length>=2)&&['guardian_greaves','mekansm'].some(id=>useItem(g,h,id)))return true;
  if(mana<.6&&useItem(g,h,'arcane_boots'))return true;
  if(heroFight){
    if(!Skills.debuffImmune(g,h)&&(d<700||retreating)&&useItem(g,h,'black_king_bar'))return true;
    if(hp<.45&&useItem(g,h,'satanic'))return true;
    if((retreating||hp<.65)&&useItem(g,h,'glimmer_cape',h))return true;
    const escape=retreatPoint(h,ctx),escapeAngle=Math.atan2(escape.y-h.y,escape.x-h.x);
    if(retreating&&Math.cos((h.angle||0)-escapeAngle)>.6&&useItem(g,h,'force_staff',h))return true;
    if(hp<.5&&useItem(g,h,'manta'))return true;
    if(d<650&&['axe','kunkka'].includes(h.heroId)&&useItem(g,h,'blade_mail'))return true;
    if(d<750&&['shivas_guard','pipe','crimson_guard'].some(id=>useItem(g,h,id)))return true;
    if(target?.kind==='hero'&&['sheepstick','bloodthorn','orchid','rod_of_atos','gungir'].some(id=>{
      if(!h.inventory.includes(id))return false;
      const v=ITEM_BY_ID[id].values,window={delay:0,duration:v.sheep_duration||v.silence_duration||v.duration,silence:!!v.silence_duration};
      return canControl(g,h,target,window)&&useItem(g,h,id,target);
    }))return true;
    if(d<800&&useItem(g,h,'mjollnir',h))return true;
    if(!retreating&&target&&target.kind==='hero'&&d>400&&d<1150&&hp>.5&&!ctx.unsafeTower&&['axe','kunkka'].includes(h.heroId)){
      const point={x:target.x+(h.x-target.x)/d*65,y:target.y+(h.y-target.y)/d*65};
      if(['overwhelming_blink','blink'].some(id=>useItem(g,h,id,point)))return true;
    }
  }
  if((retreating||target&&d>h.range+90||!target&&distance(h,BASES[h.team])>1500)&&useItem(g,h,'phase_boots'))return true;
  return false;
}
function castBotSkills(g,h,target,ctx,settings,retreating=false){
  const skill=i=>Skills.skillOf(h,i),ready=i=>{const s=skill(i);return s.level&&s.kind!=='passive'&&h.cooldowns[i]<=0&&h.mana>=s.mana;};
  const cast=(i,point=target)=>ready(i)&&g._cast(h,i,point).ok;
  const controlCast=(i,point=target)=>{
    if(!target||!ready(i))return false;
    const window=controlWindow(h,skill(i),target);
    if(!canControl(g,h,target,window)||!cast(i,point))return false;
    reserveControl(g,h,target,window,i);return true;
  };
  const hp=h.hp/h.maxHp,d=target?distance(h,target):Infinity,hero=target?.kind==='hero';
  if(h.heroId==='juggernaut'){
    const ward=g.entities.some(e=>e.kind==='ward'&&e.ownerId===h.id&&alive(e));
    if(hp<.72&&!ward&&cast(1,h))return true;
    if(!retreating&&hero&&d<=skill(3).range+target.radius&&!has(g,h,'spin')){
      const nearby=ctx.enemies.filter(e=>fighter(e)&&e!==target&&distance(e,target)<skill(3).values.omni_slash_radius).length;
      if((nearby<3||target.hp/target.maxHp<.4)&&cast(3))return true;
      if(h.hasScepter&&h.cooldowns[3]>0&&Skills.castExtraAbility(g,h,'juggernaut_swift_slash',target).ok)return true;
    }
    if(target&&d<=skill(0).values.blade_fury_radius+35&&!has(g,h,'spin')&&(hero||ctx.enemies.filter(e=>fighter(e)&&distance(h,e)<260).length>=3||retreating)&&cast(0,h))return true;
  }else if(h.heroId==='windranger'){
    if((retreating||d<320)&&!has(g,h,'windrun')&&cast(2,h))return true;
    if(!retreating&&target){
      if(controlCast(0))return true;
      if(hero&&!has(g,h,'focus')&&cast(3))return true;
      if((d>350||controlled(g,target))&&cast(1,predict(g,h,target,.8,settings)))return true;
      if(h.hasShard&&hero&&Skills.castExtraAbility(g,h,'windrunner_gale_force',target).ok)return true;
    }
  }else if(h.heroId==='drow_ranger'){
    if(target&&d<800&&(retreating||d<450||hero&&!Skills.hasStatusFlag(g,target,'silenced'))&&cast(1,target))return true;
    if(!retreating&&target&&d>320&&d<1100&&(hero||ctx.enemies.filter(e=>fighter(e)).length>=3)&&cast(2,predict(g,h,target,.3,settings)))return true;
    if(h.hasShard&&hero&&d<900&&!retreating&&Skills.castExtraAbility(g,h,'drow_ranger_glacier',h).ok)return true;
  }else if(h.heroId==='axe'){
    if(target&&d<=skill(3).range+target.radius&&target.hp<=skill(3).damage&&cast(3))return true;
    if(target&&d<=skill(0).values.radius&&(hero||ctx.enemies.filter(e=>fighter(e)&&distance(h,e)<315).length>=2)&&!has(g,h,'call')&&(nightmare(g,h)?controlCast(0,h):cast(0,h)))return true;
    if(!retreating&&target&&!Object.values(target.statuses||{}).some(s=>s.hunger&&s.sourceId===h.id&&s.until>g.time)&&cast(1))return true;
  }else if(h.heroId==='crystal_maiden'){
    if(retreating&&h.hasShard&&Skills.castExtraAbility(g,h,'crystal_maiden_crystal_clone',BASES[h.team]).ok)return true;
    if(target){
      if(controlCast(1))return true;
      const cluster=clusterPoint(g,h,ctx,skill(0).range,skill(0).values.radius);
      if(cluster.point&&(hero||cluster.score>=3)&&cast(0,cluster.point))return true;
      if(!retreating&&!h.freezingField&&hero&&hp>.4&&d<skill(3).values.radius*.82&&(controlled(g,target)||ctx.enemyHeroes.length>=2||target.hp/target.maxHp<.6)&&cast(3,h))return true;
    }
  }else if(h.heroId==='ogre_magi'){
    if(target&&controlCast(0))return true;
    if(target&&!retreating&&(!has(g,target,'ogreIgnite')||target.statuses.ogreIgnite.until-g.time<2)&&cast(1))return true;
    if(hero&&h.hasScepter&&h.cooldowns[0]>0){
      const id='ogre_magi_unrefined_fireblast',window=controlWindow(h,Skills.extraSkillOf(h,id),target);
      if((!nightmare(g,h)||canControl(g,h,target,window))&&Skills.castExtraAbility(g,h,id,target).ok){reserveControl(g,h,target,window,null,id);return true;}
    }
    const allies=ctx.allies.filter(a=>distance(h,a)<=650&&(!has(g,a,'ogreBloodlust')||a.statuses.ogreBloodlust.until-g.time<3)).sort((a,b)=>g.combatStats(b).damage-g.combatStats(a).damage);
    if((target||retreating)&&allies[0]&&cast(2,allies[0]))return true;
    const shieldTarget=ctx.allies.filter(a=>distance(h,a)<=600&&(!has(g,a,'ogreFireShield')||a.statuses.ogreFireShield.stacks<2)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(h.hasShard&&ctx.enemyHeroes.length&&shieldTarget&&Skills.castExtraAbility(g,h,'ogre_magi_smash',shieldTarget).ok)return true;
  }else if(h.heroId==='kunkka'&&target){
    if(!retreating&&hero&&!h.xMark&&cast(2))return true;
    const mark=h.xMark&&g.entities.find(e=>e.id===h.xMark.targetId&&alive(e));
    if(!retreating&&(hero||ctx.enemies.filter(e=>fighter(e)).length>=3)){
      const point=mark?h.xMark:predict(g,h,target,skill(0).values.delay+skill(0).castPoint,settings);
      if((nightmare(g,h)?controlCast(0,point):cast(0,point))){if(h.xMark)h.xMark.returnAt=g.time+skill(0).castPoint+skill(0).values.delay-.12;return true;}
      if(hero&&(nightmare(g,h)?controlCast(3,mark?h.xMark:predict(g,h,target,controlWindow(h,skill(3),target).delay,settings)):cast(3,mark?h.xMark:predict(g,h,target,1,settings))))return true;
      if(h.hasShard&&Skills.castExtraAbility(g,h,'kunkka_tidal_wave',target).ok)return true;
    }
  }
  return false;
}
function macroGoal(g,h,ctx){
  const state=h.botState;
  const plan=tacticalPlan(g,h);
  if(plan?.goal){
    state.mode=plan.mode;state.goal=plan.goal;state.nextMacroAt=g.time+.2;
    state.objectiveId=plan.objectiveId;state.objectiveKey=plan.key;
    if(plan.lane!=null&&plan.lane!==h.lane){h.lane=plan.lane;h.pathIndex=0;}
    return state.goal;
  }
  const rejoinLane=state.objectiveKey||state.mode!=='push'||state.lane!==h.lane;
  if(state.objectiveKey){state.objectiveKey=null;state.objectiveId=null;state.goal=null;state.nextMacroAt=0;}
  if(g.time<state.nextMacroAt&&state.goal)return state.goal;
  state.nextMacroAt=g.time+(nightmare(g,h)? .2:1.2);
  if(h.botShop?.needsShop){
    const shops=[BASES[h.team],...Inventory.SECRET_SHOPS].sort((a,b)=>distance(h,a)-distance(h,b));state.mode='resupply';return state.goal=shops[0];
  }
  const neutral=ctx.units.find(e=>e.kind==='neutral'&&!e.ancient&&!e.isRoshan&&!e.returning&&distance(h,e)<1000);
  if(g.time>90&&h.level>=3&&h.hp/h.maxHp>.68&&['axe','juggernaut','kunkka'].includes(h.heroId)&&neutral){h.farmTargetId=neutral.id;state.mode='farm';return state.goal=neutral;}
  // Rejoin once after a task/lane change. Repeated nearest-point resets pull a
  // pushing hero back as soon as it moves 180 units beyond a passed waypoint.
  if(rejoinLane){
    const path=TEAM_LANES[h.team][h.lane],nearest=path.reduce((best,p,i)=>distance(p,h)<distance(path[best],h)?i:best,0);
    h.pathIndex=Math.min(path.length-1,nearest+(distance(h,path[nearest])<180?1:0));
    state.lane=h.lane;h.navPath=null;h.navRetryAt=0;
  }
  state.mode='push';state.goal=null;return null;
}

export function tickBusyBot(g,h){
  if(h.isPlayer||h.isHuman)return;
  if(h.channel?.kind==='freezing'&&h.hp/h.maxHp<.25){Skills.interruptCast(g,h,false);h.retreating=true;}
  else if(h.channel?.kind==='powershot'&&h.hp/h.maxHp<.22){Skills.interruptCast(g,h,true);h.retreating=true;}
}
export function tickBot(g,h,dt){
  maintainBot(g,h);if(h.isPlayer||h.isHuman||g.paused||h.aiTimer===Infinity||!alive(h)||g.status!=='playing')return;
  if(h.itemChannel)return;
  const settings=botProfile(g,h),state=h.botState||=( {mode:'push',targetId:null,nextMacroAt:0,goal:null,chaseStartedAt:0} );
  if(nightmare(g,h))director(g);
  h.aiTimer-=dt;const ctx=context(g,h,settings.awareness),hp=h.hp/h.maxHp;
  if(h.heroId==='kunkka'&&h.xMark?.returnAt<=g.time){g._cast(h,2);return;}
  const danger=hp<.2||hp<.35&&ctx.enemyHeroes.length>0||hp<.28&&ctx.enemyHeroes.length===0;
  if(h.retreating&&hp>.82&&!danger&&g.time>=(state.recoverUntil||0)){
    h.retreating=false;state.goal=null;state.safety=null;state.escapeGoal=null;state.nextMacroAt=0;
  }
  if(danger){if(!h.retreating)state.recoverUntil=g.time+4;h.retreating=true;state.mode='retreat';}
  let safety=h.retreating?null:safetyGoal(g,h,ctx,settings);
  const plan=tacticalPlan(g,h);
  if(!h.retreating&&plan&&['defend','assist'].includes(plan.mode)){
    // A remote urgent task takes precedence over farming or waiting at an enemy tower.
    if(safety?.mode==='wait-wave'&&distance(plan.goal,tacticalWorld(g).entities.get(safety.threatId))>1400){state.safety=null;safety=null;}
    macroGoal(g,h,ctx);
    if(!safety&&trySupportTeleport(g,h,plan,ctx))return;
  }
  const defensive=h.retreating||!!safety;
  if(h.aiTimer<=0){
    h.aiTimer=settings.reaction+g._random()*settings.jitter;
    const target=chooseBotTarget(g,h,ctx);
    if(target?.id!==state.targetId){state.chaseStartedAt=g.time;state.chaseOrigin={x:h.x,y:h.y};}
    state.targetId=target?.id||null;h.targetId=state.targetId;
    const castTarget=target||(defensive?ctx.enemyHeroes[0]:null);
    if(useBotItems(g,h,castTarget,ctx,defensive)||castBotSkills(g,h,castTarget,ctx,settings,defensive))return;
  }
  if(h.retreating){
    h.targetId=null;state.targetId=null;
    if(ctx.enemyHeroes.length||ctx.towers.length){
      if(!state.escapeGoal||g.time>=(state.nextEscapeAt||0)&&distance(h,state.escapeGoal)<180){
        state.escapeGoal=g.navigation.nearestWalkable(retreatPoint(h,ctx));state.nextEscapeAt=g.time+1.2;
      }
      g._move(h,state.escapeGoal,dt,20);
    }
    else if(distance(h,BASES[h.team])>1500&&!controlled(g,h)&&h.tp?.some(Boolean)&&g.time>=(state.nextRecoveryTpAt||0)){
      state.nextRecoveryTpAt=g.time+1;
      if(ItemRuntime.useItem(g,h,h.tp.indexOf('tpscroll'),BASES[h.team],'tp').ok)return;
      g._move(h,BASES[h.team],dt,150);
    }
    else g._move(h,BASES[h.team],dt,150);
    return;
  }
  let target=nightmare(g,h)?ctx.enemies.find(e=>e.id===state.targetId)||director(g).entities.get(state.targetId):
    g.entities.find(e=>e.id===state.targetId);
  if(!alive(target)||!g.canSee(h,target)||g.isProtected(target)||Skills.isInvulnerable(g,target)||
    ctx.unsupported.some(t=>distance(t,target)<t.range+80)||target.kind==='hero'&&badMatchup(g,h,target,ctx))target=null;
  if(safety){
    state.mode=safety.mode;state.goal=safety.goal;h.targetId=null;
    // Safe last hits may continue while holding position; they must not restart a chase.
    if(target&&target.kind!=='hero'&&distance(h,target)<=h.range+target.radius&&g._attack(h,target))return;
    state.targetId=null;g._move(h,safety.goal,dt,25);return;
  }
  if(plan&&['defend','assist'].includes(plan.mode)&&distance(h,plan.goal)>1600&&target?.kind!=='hero')target=null;
  if(target?.kind==='hero'&&g.time-state.chaseStartedAt>6&&target.hp/target.maxHp>.3&&state.chaseOrigin&&distance(h,state.chaseOrigin)>1000){state.ignoredTarget={id:target.id,until:g.time+4};target=null;state.targetId=null;state.nextMacroAt=0;}
  if(target){
    state.mode='fight';h.targetId=target.id;
    if(g._attack(h,target))return;
    const d=distance(h,target),range=h.range+target.radius-5;
    if(h.range>300&&h.attackCooldown>.12&&d<Math.min(350,h.range*.7)){state.mode='kite';g._move(h,retreatPoint(h,{enemyHeroes:[target],towers:[]}),dt);}
    else if(d>range)g._move(h,target,dt,range);
    return;
  }
  h.targetId=null;const goal=macroGoal(g,h,ctx);
  if(state.mode==='farm'&&goal){h.targetId=goal.id;if(!g._attack(h,goal))g._move(h,goal,dt,h.range+goal.radius-5);}
  else if(goal)g._move(h,goal,dt,state.mode==='resupply'?300:state.mode==='assist'?Math.max(120,h.range*.65):220);
  else g._followLane(h,dt);
}
