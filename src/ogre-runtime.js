import * as Skills from './hero-runtime.js';
import { ACTIVE_ITEM_HANDLERS, findItemTarget } from './item-actives.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=e=>e&&!e.dead&&e.hp>0;
const fighter=e=>['hero','creep','neutral','summon','illusion'].includes(e?.kind);
const building=e=>['tower','barracks','ancient','filler','fountain'].includes(e?.kind);
const friendly=e=>fighter(e)||building(e);
const ownEvent=s=>s.type.startsWith('ogre:');
const areaBonus=h=>(h.spellAoE||0);

export function multicastChances(h){
  const skill=Skills.skillOf(h,3);if(!skill.level)return [0,0,0];
  const bonus=(h.strength||0)/skill.values.strength_for_one_pct;
  return [2,3,4].map(n=>{const base=skill.values[`multicast_${n}_times`]||0;return base>0?Math.min(100,base+bonus):0;});
}
export function rollMulticast(g,h){
  if(h.heroId!=='ogre_magi'||Skills.hasStatusFlag(g,h,'break')||!Skills.skillOf(h,3).level)return 1;
  const [two,three,four]=multicastChances(h),roll=g._random()*100;
  return roll<four?4:roll<three?3:roll<two?2:1;
}
function announce(g,h,count){if(count>1)g._effect('text',h.x,h.y-90,{text:`${count}× 多重施法`,life:1,color:count===4?'#ffdc6d':'#ffaf68'});}
function choose(g,h,team,center,radius,exclude=[]){
  const candidates=g.entities.filter(e=>alive(e)&&!exclude.includes(e.id)&&distance(e,center)<=radius&&g.canSee(h,e)&&!Skills.isInvulnerable(g,e)&&
    (team==='ally'?e.team===h.team&&friendly(e):e.team!==h.team&&fighter(e)));
  if(!candidates.length)return null;return candidates[Math.min(candidates.length-1,Math.floor(g._random()*candidates.length))];
}
function effect(g,h,type,target,fields={}){g._effect(type,target.x,target.y,{sourceId:h.id,heroId:h.heroId,team:h.team,...fields});}
function ogreStun(g,h,target,duration){
  Skills.addStatus(g,target,'ogreFireblastStun',{name:'火焰爆轰',icon:'fire',sourceId:h.id,duration:duration*(1-Skills.statusResistance(g,target)),stunned:true,suppressedByDebuffImmunity:true});
  if(!Skills.debuffImmune(g,target)){Skills.interruptCast(g,target,false);target.recallTimer=0;}
}
function fireblast(g,h,target,skill,unrefined=false,options={}){
  if(!alive(target)||Skills.isInvulnerable(g,target))return false;
  if(!options.fromAttack&&!options.skipBlock&&g.blockTargetSpell?.(h,target,skill)){
    if(options.group)g.pendingSpells=g.pendingSpells.filter(s=>s.group!==options.group);return false;
  }
  if(!options.fromAttack&&!options.reflected&&Skills.hasStatusFlag(g,target,'spellReflect')&&alive(h))fireblast(g,target,h,skill,unrefined,{reflected:true});
  const damage=unrefined?skill.values.base_damage+skill.values.str_multiplier*h.strength:skill.damage;
  g.damage(target,damage,h,'magical');if(alive(target))ogreStun(g,h,target,skill.values.stun_duration);
  effect(g,h,'burst',target,{visual:'ogreFireblast',radius:90,life:.5,color:'#ff8739'});
  return true;
}
function launchMissile(g,h,from,target,fields){
  const missile={type:fields.type,sourceId:h.id,targetId:target.id,x:from.x,y:from.y,lastTick:g.time,speed:fields.speed,landAt:Infinity,disjoint:target.projectileDisjoint||0,...fields};
  effect(g,h,'projectile',from,{visual:'ogreIgnite',tracked:true,angle:Math.atan2(target.y-from.y,target.x-from.x),lift:30,color:'#fba657',life:50});
  missile.visualId=g.effects.at(-1).id;g.pendingSpells.push(missile);
}
function igniteMissile(g,h,target,skill,reflected=false){
  if(!alive(target))return;
  launchMissile(g,h,h,target,{type:'ogre:ignite',skill,speed:skill.values.projectile_speed,reflected});
}
function ignite(g,h,target,skill,reflected=false){
  igniteMissile(g,h,target,skill,reflected);
  const other=choose(g,h,'enemy',h,skill.values.ignite_multicast_aoe+areaBonus(h),[target.id]);if(other)igniteMissile(g,h,other,skill,reflected);
}
function bloodlustTarget(g,h,radius,used){
  const eligible=g.entities.filter(e=>alive(e)&&e.team===h.team&&friendly(e)&&distance(h,e)<=radius&&!used.includes(e.id)&&
    (!Skills.isInvulnerable(g,e)||building(e))&&!(e.statuses?.ogreBloodlust?.until>g.time));
  const own=eligible.find(e=>e.id===h.id);if(own)return own;
  for(const group of [e=>e.kind==='hero',building,e=>fighter(e)]){const list=eligible.filter(group);if(list.length)return list[Math.min(list.length-1,Math.floor(g._random()*list.length))];}
  return null;
}
function bloodlust(g,h,target,skill){
  if(!alive(target)||target.team!==h.team||!friendly(target)||Skills.isInvulnerable(g,target)&&!building(target))return;
  Skills.addStatus(g,target,'ogreBloodlust',{name:'嗜血术',description:'提升移动速度和攻击速度；食人魔自身获得额外攻速。',positive:true,icon:'hunger',sourceId:h.id,
    duration:skill.values.duration,keepLonger:false,movePercent:skill.values.bonus_movement_speed,attackSpeed:target.id===h.id?skill.values.self_bonus:skill.values.bonus_attack_speed,modelScale:skill.values.modelscale});
  effect(g,h,'burst',target,{visual:'ogreBloodlust',radius:80,life:.4,color:'#f28c60'});
}
function shield(g,h,target,skill){
  if(!alive(target)||target.team!==h.team||!friendly(target)||Skills.isInvulnerable(g,target))return;
  Skills.addStatus(g,target,'ogreFireShield',{name:'烈火护盾',description:'抵挡接下来三次敌方英雄攻击的部分伤害，并发射反击火球。',positive:true,icon:'shield',sourceId:h.id,
    duration:skill.values.duration,keepLonger:false,stacks:skill.values.attacks,values:{...skill.values}});
  effect(g,h,'ring',target,{visual:'ogreShield',radius:75,life:.5,color:'#ffb967'});
}
export function releaseOgreAbility(g,h,phase){
  const skill=phase.skill,target=g.entities.find(e=>e.id===phase.targetId),index=phase.index;
  if(!target)return;
  const blasting=index===0||phase.extraId==='ogre_magi_unrefined_fireblast';
  if(blasting&&!phase.fromAttack&&g.blockTargetSpell?.(h,target,skill))return;
  const count=rollMulticast(g,h);announce(g,h,count);
  if(index===0||phase.extraId==='ogre_magi_unrefined_fireblast'){
    const unrefined=!!phase.extraId,group=g._id('ogreCast');fireblast(g,h,target,skill,unrefined,{fromAttack:phase.fromAttack,skipBlock:true,group});
    for(let n=1;n<count;n++)g.pendingSpells.push({type:'ogre:fireblast',sourceId:h.id,targetId:target.id,skill,unrefined,fromAttack:phase.fromAttack,group,landAt:g.time+n*skill.values.multicast_delay});
  }else if(index===1){
    ignite(g,h,target,skill);
    for(let n=1;n<count;n++)g.pendingSpells.push({type:'ogre:igniteCast',sourceId:h.id,skill,landAt:g.time+n*skill.values.multicast_delay});
  }else{
    const fireShield=phase.extraId==='ogre_magi_smash',apply=fireShield?shield:bloodlust;
    apply(g,h,target,skill);const used=[target.id],radius=(fireShield?skill.values.multicast_fireshield_aoe:skill.values.multicast_bloodlust_aoe)+areaBonus(h);
    for(let n=1;n<count;n++){const ally=fireShield?choose(g,h,'ally',h,radius,used):bloodlustTarget(g,h,radius,used);if(!ally)break;used.push(ally.id);apply(g,h,ally,skill);}
  }
}
export function tickOgreWorld(g){
  for(const spell of g.pendingSpells)if(ownEvent(spell)&&spell.speed&&spell.landAt===Infinity){
    const target=g.entities.find(e=>e.id===spell.targetId);
    if(!alive(target)||Skills.isInvulnerable(g,target)||(target.projectileDisjoint||0)!==spell.disjoint){spell.cancelled=true;spell.landAt=g.time;continue;}
    const d=distance(spell,target),step=spell.speed*(g.time-spell.lastTick),angle=Math.atan2(target.y-spell.y,target.x-spell.x);spell.lastTick=g.time;
    if(d<=step+1e-7){spell.x=target.x;spell.y=target.y;spell.landAt=g.time;}else{spell.x+=Math.cos(angle)*step;spell.y+=Math.sin(angle)*step;}
    const visual=g.effects.find(e=>e.id===spell.visualId);if(visual)Object.assign(visual,{x:spell.x,y:spell.y,angle});
  }
  const ready=g.pendingSpells.filter(s=>ownEvent(s)&&s.landAt<=g.time+1e-7);g.pendingSpells=g.pendingSpells.filter(s=>!ownEvent(s)||s.landAt>g.time+1e-7);
  for(const spell of ready){
    if(spell.visualId)g.effects=g.effects.filter(e=>e.id!==spell.visualId);
    if(spell.cancelled)continue;
    const h=g.entities.find(e=>e.id===spell.sourceId);if(!h)continue;
    const target=g.entities.find(e=>e.id===spell.targetId),skill=spell.skill;
    if(spell.type==='ogre:fireblast')fireblast(g,h,target,skill,spell.unrefined,{fromAttack:spell.fromAttack,group:spell.group});
    else if(spell.type==='ogre:igniteCast'){const victim=choose(g,h,'enemy',h,skill.values.ignite_multicast_aoe+areaBonus(h));if(victim)ignite(g,h,victim,skill);}
    else if(spell.type==='ogre:ignite'){
      if(!alive(target)||Skills.isInvulnerable(g,target)||(target.projectileDisjoint||0)!==spell.disjoint||g.blockTargetSpell?.(h,target,skill))continue;
      if(!spell.reflected&&Skills.hasStatusFlag(g,target,'spellReflect')&&alive(h))ignite(g,target,h,skill,true);
      const old=target.statuses?.ogreIgnite,until=(old?.until>g.time?old.until:g.time)+skill.values.duration;
      Skills.addStatus(g,target,'ogreIgnite',{name:'引燃',description:'持续受到魔法伤害并减速；重复命中增加持续时间。',icon:'fire',sourceId:h.id,until,keepLonger:false,
        slowPct:Math.abs(skill.values.slow_movement_speed_pct),tickInterval:1,tickDamage:skill.values.burn_damage,fullDamageTicks:true,damageType:'magical',nextTick:old?.until>g.time?old.nextTick:g.time+.1});
      effect(g,h,'burst',target,{visual:'ogreFireblast',radius:55,life:.35,color:'#e89a49'});
    }else if(spell.type==='ogre:shieldCounter'){
      if(!alive(target)||Skills.isInvulnerable(g,target)||(target.projectileDisjoint||0)!==spell.disjoint)continue;
      g.damage(target,spell.damage,h,'magical');effect(g,h,'burst',target,{visual:'ogreFireblast',radius:55,life:.3,color:'#ffac54'});
    }
  }
}
export function fireShieldDamage(g,target,amount,source,options,type){
  const shield=target.statuses?.ogreFireShield;
  const attacker=source?.kind==='illusion'?g.entities.find(e=>e.id===source.ownerId)||source:source;
  if(!shield||shield.until<=g.time||!options.attack||attacker?.kind!=='hero'||attacker.team===target.team||amount<=0||Skills.hasStatusFlag(g,target,'damageImmunity')||Skills.isInvulnerable(g,target)||type==='physical'&&Skills.hasStatusFlag(g,target,'ethereal'))return amount;
  const h=g.entities.find(e=>e.id===shield.sourceId);shield.stacks--;
  if(h&&alive(source)){
    launchMissile(g,h,target,source,{type:'ogre:shieldCounter',damage:shield.values.damage,speed:shield.values.projectile_speed});
  }
  const result=amount*(1-shield.values.damage_absorb_pct/100);if(shield.stacks<=0)delete target.statuses.ogreFireShield;return result;
}
const prdCache=new Map();
function prdConstant(percent){
  if(prdCache.has(percent))return prdCache.get(percent);let low=0,high=percent/100;
  for(let i=0;i<48;i++){const c=(low+high)/2;let survival=1,expected=0;for(let n=1;survival>1e-12;n++){expected+=survival;survival*=1-Math.min(1,n*c);}if(1/expected>percent/100)high=c;else low=c;}
  const c=(low+high)/2;prdCache.set(percent,c);return c;
}
export function ogreAttackProc(g,h,target){
  if(h.heroId!=='ogre_magi'||h.kind!=='hero'||!h.talents?.includes(6)||!fighter(target)||!alive(target))return;
  const skill=Skills.skillOf(h,0);if(!skill.level||!skill.values.fireblast_proc)return;
  const chance=Math.min(1,prdConstant(skill.values.fireblast_proc)*((h.ogreProcFailures||0)+1));
  if(g._random()>=chance){h.ogreProcFailures=(h.ogreProcFailures||0)+1;return;}h.ogreProcFailures=0;
  releaseOgreAbility(g,h,{index:0,skill,targetId:target.id,fromAttack:true});
}
export function tickBloodlustAutocast(g,h){
  if(h.autocast?.[2]!==true||h.castPhase||h.channel||Skills.isStunned(g,h)||Skills.hasStatusFlag(g,h,'silenced')||g.time<(h.nextBloodlustCheck||0))return;
  h.nextBloodlustCheck=g.time+.25;const skill=Skills.skillOf(h,2);if(!skill.level||h.cooldowns[2]>0||h.mana<skill.mana)return;
  const allies=g.entities.filter(e=>alive(e)&&e.team===h.team&&friendly(e)&&distance(h,e)<=skill.range+(h.castRangeBonus||0)&&e.targetId&&
    (!e.statuses?.ogreBloodlust||e.statuses.ogreBloodlust.until-g.time<3)).sort((a,b)=>(b.damage||0)-(a.damage||0));
  if(allies[0])g._cast(h,2,allies[0]);
}
const excludedItems=new Set(['tpscroll','magic_stick','magic_wand','faerie_fire','enchanted_mango','clarity','flask','bottle','moon_shard','helm_of_the_dominator','helm_of_the_overlord']);
export function multicastItem(g,h,entry,target,originalMeta){
  if(h.heroId!=='ogre_magi'||!target||target.team===h.team||excludedItems.has(entry.id))return;
  if(['urn_of_shadows','spirit_vessel'].includes(entry.id)){announce(g,h,rollMulticast(g,h));return;}
  const handler=ACTIVE_ITEM_HANDLERS[entry.id];if(!['enemyUnit','enemyCreep','allyUnit','allyHero','anyUnit','allyOptional'].includes(handler?.target))return;
  const count=rollMulticast(g,h);announce(g,h,count);const used=[target.id],ally=false,radius=(entry.item.range||0)+600+(h.castRangeBonus||0);
  for(let n=1;n<count;n++){
    let candidate=null;
    const pool=g.entities.filter(e=>alive(e)&&!used.includes(e.id)&&distance(e,h)<=radius&&g.canSee(h,e)&&!Skills.isInvulnerable(g,e)&&(ally?e.team===h.team:e.team!==h.team)&&fighter(e));
    while(pool.length){
      const at=Math.min(pool.length-1,Math.floor(g._random()*pool.length)),unit=pool.splice(at,1)[0];
      const extra={...entry,item:{...entry.item,range:radius},meta:{...originalMeta}};
      const selection=findItemTarget(g,h,extra,unit);if(!selection.ok||selection.target?.id!==unit.id)continue;
      if(!ally&&Skills.debuffImmune(g,unit)&&!['abyssal_blade','nullifier'].includes(entry.id))continue;
      candidate={unit,extra,selection};break;
    }
    if(!candidate)break;const {unit,extra,selection}=candidate;used.push(unit.id);
    if(!ally&&g.blockTargetSpell?.(h,unit,{itemId:entry.id}))continue;
    if(!ally&&Skills.hasStatusFlag(g,unit,'spellReflect'))handler.run(g,unit,extra,h,h);
    handler.run(g,h,extra,selection.point,unit);
  }
}
