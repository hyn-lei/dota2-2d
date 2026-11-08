import * as Skills from './hero-runtime.js';
import { innateAt } from './ability-data.js';
import { Navigator } from './navigation.js';
import { allTrees } from './item-common.js';
import {weakIllusion} from './illusions.js';
import {spendMana} from './mana-runtime.js';
const alive=e=>e&&!e.dead&&e.hp>0;
const fighter=e=>['hero','creep','neutral','illusion','summon'].includes(e?.kind);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const effect=(g,h,type,x,y,fields)=>g._effect(type,x,y,{sourceId:h.id,heroId:h.heroId,team:h.team,...fields});
const glacierAt=(g,h)=>(g.itemZones||[]).find(z=>z.type==='drowGlacier'&&z.team===h.team&&z.until>g.time&&distance(z,h)<=z.radius);
export function marksmanshipActive(g,h,s=Skills.skillOf(h,3)){
 return (h.kind==='hero'||h.kind==='illusion')&&s.level>0&&!Skills.hasStatusFlag(g,h,'break')&&(!!glacierAt(g,h)||
  !g.entities.some(e=>alive(e)&&e.kind==='hero'&&e.team!==h.team&&!Skills.isInvulnerable(g,e)&&g.canSee(h,e)&&distance(h,e)<=s.values.disable_range));
}
export function drowAttack(g,h,target,options,result){
 if(h.heroId!=='drow_ranger'||!['hero','illusion'].includes(h.kind))return result;
 const s=Skills.castingStats(h,Skills.skillOf(h,0));
 if(!weakIllusion(h)&&s.level&&fighter(target)&&(options.manualFrost||h.frostArrowTarget===target.id||h.autocast?.[0])&&h.mana>=s.mana){
  spendMana(h,s.mana);h.frostArrowTarget=null;result.frostArrow=s;
 }
 if(fighter(target)&&marksmanshipActive(g,h)&&g._random()*100<Skills.skillOf(h,3).values.chance){result.marksmanship=true;result.damage+=Skills.skillOf(h,3).values.bonus_damage;}
 if(glacierAt(g,h)&&!glacierAt(g,target))result.damage*=1+(Skills.extraSkillOf(h,'drow_ranger_glacier')?.values.damage_bonus||0)/100;
 return result;
}
export function frostBonusDamage(g,target,s){
 if(!s||Skills.debuffImmune(g,target)||Skills.isInvulnerable(g,target))return 0;
 const v=s.values,stacks=target.statuses?.drowHypothermia?.until>g.time?target.statuses.drowHypothermia.stacks:0;
 return s.damage+(v.shard_max_stacks>0?Math.min(v.shard_max_stacks,stacks+1)*v.shard_bonus_damage_per_stack:0);
}
export function frostHit(g,h,target,s){
 if(!alive(target)||Skills.debuffImmune(g,target)||Skills.isInvulnerable(g,target))return;
 Skills.addStatus(g,target,'drowFrost',{name:'冰霜之箭',icon:'snow',sourceId:h.id,duration:s.duration*(1-Skills.statusResistance(g,target)),slowPct:Math.abs(s.values.frost_arrows_movement_speed)});
 effect(g,h,'burst',target.x,target.y,{visual:'drowFrostImpact',radius:65,life:.35,color:'#b8efff'});
 if(s.values.shard_max_stacks>0){const v=s.values,old=target.statuses?.drowHypothermia,stacks=Math.min(v.shard_max_stacks,(old?.until>g.time?old.stacks:0)+1);
  Skills.addStatus(g,target,'drowHypothermia',{name:'低温',icon:'snow',sourceId:h.id,duration:v.shard_stack_duration,stacks,healReduction:Math.min(100,stacks*v.shard_regen_reduction_pct_per_stack),frostSkill:s});
  if(stacks===v.shard_max_stacks){delete target.statuses.drowHypothermia;hypothermiaBurst(g,h,target,s,stacks);}
 }
}
export function hypothermiaBurst(g,h,target,s,stacks){
 const v=s.values;
 effect(g,h,'burst',target.x,target.y,{visual:'frostNova',radius:v.shard_burst_radius,life:.65,color:'#c6f2ff'});
 for(const e of g.entities)if(alive(e)&&fighter(e)&&e.team!==h.team&&distance(e,target)<=v.shard_burst_radius+(e.radius||0)){
  g.damage(e,stacks*v.shard_burst_damage_per_stack,h,'magical');
  if(alive(e)&&!Skills.debuffImmune(g,e))Skills.addStatus(g,e,'hypothermiaBurst',{name:'低温爆发',icon:'snow',duration:v.shard_burst_slow_duration,sourceId:h.id,slowPct:v.shard_burst_move_slow_pct});
 }
}
export function onDrowTargetKilled(g,target){
 const s=target.statuses?.drowHypothermia;
 if(s&&s.until>g.time){const h=g.entities.find(e=>e.id===s.sourceId);if(h)hypothermiaBurst(g,h,target,s.frostSkill,s.stacks);}
}
export function releaseDrow(g,h,phase){
 const s=phase.skill,v=s.values,dir={x:Math.cos(h.angle),y:Math.sin(h.angle)};
 if(phase.index===1){
  g.pendingSpells.push({type:'drowGust',sourceId:h.id,skill:s,origin:{x:h.x,y:h.y},dir,traveled:0,hits:[],startedAt:g.time,landAt:g.time+v.wave_length/v.wave_speed});
  effect(g,h,'projectile',h.x,h.y,{visual:'drowGust',tx:h.x+dir.x*v.wave_length,ty:h.y+dir.y*v.wave_length,radius:v.wave_width,life:v.wave_length/v.wave_speed,color:'#dbf6ff'});
  if(v.bonus_movespeed)Skills.addStatus(g,h,'gustSpeed',{name:'狂风迅行',positive:true,icon:'wind',duration:v.silence_duration,movePercent:v.bonus_movespeed});
 }else if(phase.index===2){
  h.channel={kind:'multishot',index:2,skill:s,startedAt:g.time,until:g.time+s.channelTime,dir,arrowsFired:0,waveIds:[]};
  Skills.addStatus(g,h,'channel',{name:'多重射击',positive:true,icon:'arrow',duration:s.channelTime});
 }
}
export function tickMultishot(g,h){
 const channel=h.channel;if(channel?.kind!=='multishot')return;
 const s=channel.skill,v=s.values,count=v.arrow_count_per_wave,waves=v.wave_count;
 const waveInterval=s.channelTime/waves,arrowInterval=Math.min(.1,waveInterval/count);
 while(channel.arrowsFired<count*waves){
  const n=channel.arrowsFired,wave=Math.floor(n/count),arrow=n%count,at=channel.startedAt+wave*waveInterval+arrow*arrowInterval;
  if(at>g.time+1e-7)break;
  channel.arrowsFired++;channel.waveIds[wave]||=(g._id('drowWave'));
  const angle=Math.atan2(channel.dir.y,channel.dir.x)+(arrow/(count-1)-.5)*v.arrow_angle*Math.PI/180,dir={x:Math.cos(angle),y:Math.sin(angle)};
  const range=g.combatStats(h).range*v.arrow_range_multiplier+v.arrow_range_base;
  const frost=Skills.skillOf(h,0),damage=g.combatStats(h).damage*v.arrow_damage_pct/100;
  const shot={type:'drowMultishot',sourceId:h.id,skill:s,frostSkill:frost.level?frost:null,damage,waveId:channel.waveIds[wave],
   origin:{x:h.x,y:h.y},dir,traveled:0,range,startedAt:g.time,landAt:g.time+range/v.arrow_speed};
  g.pendingSpells.push(shot);
  effect(g,h,'projectile',h.x,h.y,{visual:'drowMultishot',tx:h.x+dir.x*range,ty:h.y+dir.y*range,lift:35,targetLift:35,life:range/v.arrow_speed,color:'#b6ecff'});shot.visualId=g.effects.at(-1).id;
 }
}
/** Sweep a moving segment, so entering/leaving a path changes the actual hit. */
export function tickDrowWorld(g){
 updateTrueshot(g);
 const done=[];
 for(const shot of g.pendingSpells)if(shot.type==='drowGust'||shot.type==='drowMultishot'){
  const h=g.entities.find(e=>e.id===shot.sourceId);if(!h){done.push(shot);continue;}
  const gust=shot.type==='drowGust',v=shot.skill.values,range=gust?v.wave_length:shot.range,speed=gust?v.wave_speed:v.arrow_speed,width=gust?v.wave_width:v.arrow_width;
  const end=Math.min(range,Math.max(0,g.time-shot.startedAt)*speed),hits=[];
  for(const e of g.entities)if(alive(e)&&fighter(e)&&e.team!==h.team&&!Skills.isInvulnerable(g,e)){
   const dx=e.x-shot.origin.x,dy=e.y-shot.origin.y,along=dx*shot.dir.x+dy*shot.dir.y,across=Math.abs(dx*shot.dir.y-dy*shot.dir.x);
   if(along<shot.traveled-(e.radius||0)||along>end+(e.radius||0)||across>width+(e.radius||0))continue;
   if(gust&&shot.hits.includes(e.id)||!gust&&e.drowWaveHits?.[shot.waveId])continue;
   hits.push({e,along});
  }
  hits.sort((a,b)=>a.along-b.along||(a.e.kind==='hero'?-1:1));
  for(const {e,along}of hits){
   if(gust){shot.hits.push(e.id);if(Skills.debuffImmune(g,e))continue;
    const fraction=Math.max(0,Math.min(1,1-along/range)),duration=v.knockback_duration_min+(v.knockback_duration-v.knockback_duration_min)*fraction;
    Skills.addStatus(g,e,'drowGustSilence',{name:'狂风沉默',icon:'wind',silenced:true,revealed:!!v.gust_reveals_invis,duration:v.silence_duration*(1-Skills.statusResistance(g,e)),sourceId:h.id});
    Skills.interruptCast(g,e,false);
    Skills.addStatus(g,e,'drowGustKnockback',{name:'狂风击退',icon:'wind',duration,forcedDirection:shot.dir,forcedSpeed:v.knockback_distance_max*fraction/duration,sourceId:h.id});
    effect(g,h,'burst',e.x,e.y,{visual:'drowGustImpact',radius:90,life:.3,color:'#e0faff'});
   }else{
    e.drowWaveHits||={};e.drowWaveHits[shot.waveId]=g.time+5;
    g.damage(e,shot.damage+frostBonusDamage(g,e,shot.frostSkill),h,'physical',{multishot:true,bypassBlock:!!v.bypass_block});
    if(shot.frostSkill)frostHit(g,h,e,shot.frostSkill);
    effect(g,h,'burst',e.x,e.y,{visual:'drowFrostImpact',radius:65,life:.3,color:'#b5e7ff'});
    done.push(shot);break;
   }
  }
  shot.traveled=end;if(g.time>=shot.landAt-1e-7)done.push(shot);
 }
 g.pendingSpells=g.pendingSpells.filter(s=>!done.includes(s));
 const removed=new Set(done.filter(s=>s.visualId).map(s=>s.visualId));g.effects=g.effects.filter(f=>!removed.has(f.id));
 for(const e of g.entities)for(const [id,until]of Object.entries(e.drowWaveHits||{}))if(until<=g.time)delete e.drowWaveHits[id];
 const zones=(g.itemZones||[]).filter(z=>z.type==='drowGlacier'&&z.until>g.time);
 const key=zones.map(z=>z.id).join(':')+':'+(g.cutTrees?.size||0)+':'+g.entities.filter(e=>e.dead&&['tower','barracks','ancient','filler'].includes(e.kind)).length;
 if(g.glacierNavKey!==key){g.glacierNavKey=key;g.glacierNavigators=new Map();for(const e of g.entities)e.navPath=null;}
}
function updateTrueshot(g){
 const drows=g.entities.filter(e=>alive(e)&&['hero','illusion'].includes(e.kind)&&e.heroId==='drow_ranger'&&!Skills.hasStatusFlag(g,e,'break'));
 for(const h of g.entities)if(['hero','illusion'].includes(h.kind)&&alive(h)){
  let bonus=0;
  for(const drow of drows){const a=innateAt('drow_ranger',drow.level).values,agi=Math.max(0,drow.agility-(drow.trueshotAgility||0));
   if(h===drow||h.team===drow.team&&h.range>200&&distance(h,drow)<=a.radius)bonus=Math.max(bonus,agi*a.trueshot_agi_bonus/100*(h===drow?1:a.trueshot_agi_bonus_allies_pct/100));
  }
  if(Math.abs((h.trueshotAgility||0)-bonus)>.001){h.trueshotAgility=bonus;g._refreshHero(h);}
  if(h.heroId==='drow_ranger')h.marksmanshipEnabled=marksmanshipActive(g,h);
 }
}
export function drowCombatStats(g,h,result){
 if(h.channel?.kind==='multishot')result.speed*=h.channel.skill.values.multishot_movespeed/100;
 const zone=glacierAt(g,h);if(zone&&h.range>200)result.range=(result.range||h.range)+zone.skill.values.attack_range_bonus;
 return result;
}
export function releaseGlacier(g,h,s){
 const v=s.values,angle=h.angle||0,zone={id:g._id('glacier'),type:'drowGlacier',sourceId:h.id,team:h.team,x:h.x,y:h.y,radius:v.ramp_radius,angle,skill:s,startedAt:g.time,until:g.time+v.shard_duration};
 g.itemZones||=[];g.itemZones.push(zone);
 effect(g,h,'glacier',h.x,h.y,{visual:'drowGlacier',radius:400,angle,life:v.shard_duration});
 for(const e of g.entities)if(alive(e)&&fighter(e)&&e.team!==h.team&&!Skills.debuffImmune(g,e)&&distance(e,h)<=v.ramp_radius+(e.radius||0)){
  const d=distance(e,h)||1;Skills.interruptCast(g,e,false);
  Skills.addStatus(g,e,'glacierKnockback',{name:'冰川击退',icon:'snow',duration:v.knockback_duration,forcedDirection:{x:(e.x-h.x)/d,y:(e.y-h.y)/d},forcedSpeed:v.knockback_distance/v.knockback_duration,sourceId:h.id});
 }
}
export function movementNavigator(g,e){
 const zones=(g.itemZones||[]).filter(z=>z.type==='drowGlacier'&&z.until>g.time&&z.sourceId!==e.id);
 if(!zones.length)return g.navigation;
 g.glacierNavigators||=new Map();const key=zones.map(z=>z.id).join(':');
 if(!g.glacierNavigators.has(key)){
  const walls=zones.flatMap(z=>Array.from({length:z.skill.values.shard_count},(_,i)=>{const angle=z.angle+(i-(z.skill.values.shard_count-1)/2)*z.skill.values.shard_angle_step*Math.PI/180;return {kind:'glacierWall',x:z.x+Math.cos(angle)*z.skill.values.shard_distance,y:z.y+Math.sin(angle)*z.skill.values.shard_distance,radius:z.skill.values.shard_width/2};}));
  g.glacierNavigators.set(key,new Navigator(g.navigation.grid,allTrees(g),[...g.entities.filter(e=>['tower','barracks','ancient','fountain','filler'].includes(e.kind)),...walls]));
 }
 return g.glacierNavigators.get(key);
}
