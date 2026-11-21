import {MAP_OBJECTIVES,LANE_SPAWNS} from './map-data.js';
import {LANE_CREEPS,WORLD_UNITS} from './unit-data.js';
import {NEUTRAL_ARTIFACT_POOLS,NEUTRAL_CRAFT_RULES,ITEM_BY_ID} from './item-data.js';
import * as Inventory from './inventory.js';
import * as Skills from './hero-runtime.js';
import {alive,distance,fighter,heal} from './item-common.js';
import {restoreMana} from './mana-runtime.js';

export const NEUTRAL_TIER_TIMES=Object.freeze([0,0,900,1800,3000]);
export function initializeWorld(g){
 g.glyphStates=[{rechargeAt:[],cooldownUntil:0},{rechargeAt:[],cooldownUntil:0}];
 g.tormentorDeaths=0;g.tormentorRespawnAt=900;g.madstoneDrops=[];
 g.worldObjectives=[];
 const add=(key,type)=>{for(const [index,p]of (MAP_OBJECTIVES[key]||[]).entries())g.worldObjectives.push({...p,objectiveType:type,team:type==='outpost'?index:2});};
 add('npc_dota_watch_tower','outpost');add('npc_dota_xp_fountain','wisdom');add('npc_dota_unit_twin_gate','gate');add('dota_item_rune_spawner_powerup','powerRune');
}
export function initializeNeutralHero(g,h){
 h.madstone=0;h.madstoneEarned=0;h.neutralTier=0;h.neutralItem=null;h.neutralEnchantment=null;
 h.neutralArtifactOptions={};
 // The opening deck is independent of the combat random stream.
 let deckSeed=g.seed>>>0;for(const char of `${h.heroId}:${h.team}`)deckSeed=Math.imul(deckSeed^char.charCodeAt(0),16777619)>>>0;deckSeed||=0x6d2b79f5;
 const random=()=>{deckSeed^=deckSeed<<13;deckSeed^=deckSeed>>>17;deckSeed^=deckSeed<<5;return (deckSeed>>>0)/4294967296;};
 for(let tier=1;tier<=4;tier++)h.neutralArtifactOptions[tier]=(NEUTRAL_ARTIFACT_POOLS[tier]||NEUTRAL_ARTIFACT_POOLS[tier-1]||[]).map(pool=>pool[Math.floor(random()*pool.length)]);
}
export function madstoneCap(g){if(g.time>=3900)return Infinity;return [6,16,26,40][Math.max(0,[0,900,1800,3000].filter(t=>g.time>=t).length-1)];}
function enchantments(h,tier){
 const options=NEUTRAL_CRAFT_RULES[tier].enhancements;
 return Object.keys({...options.global,...options[h.primaryAttribute||'strength']});
}
export function neutralCraftState(g,h){
 const tier=Math.min(4,(h.neutralTier||0)+1),rule=NEUTRAL_CRAFT_RULES[tier],cost=rule.cost+(tier===4&&h.neutralTier===4?rule.recraftCost*((h.neutralRecrafts||0)+1):0),availableAt=rule.startTime;
 return {tier,cost,availableAt,madstone:h.madstone||0,cap:madstoneCap(g),canCraft:!h.dead&&g.time>=availableAt&&(h.madstone||0)>=cost,artifacts:h.neutralArtifactOptions?.[tier]||[],enchantments:enchantments(h,tier)};
}
export function craftNeutral(g,h,artifactId,enchantmentId){
 const state=neutralCraftState(g,h);if(g.paused||g.status!=='playing'||!state.canCraft)return {ok:false,reason:g.time<state.availableAt?'尚未到达该等级的开放时间':'魔石不足或英雄无法打造'};
 if(artifactId==='keep')artifactId=h.neutralItem;
 if(!artifactId||!state.artifacts.includes(artifactId)&&artifactId!==h.neutralItem||!state.enchantments.includes(enchantmentId))return {ok:false,reason:'请选择本局可用的珍品和附魔'};
 const old=h.neutralItem,meta=h.neutralItemMeta||{},keeping=artifactId===old;
 h.madstone-=state.cost;
 if(h.neutralTier===4)h.neutralRecrafts=(h.neutralRecrafts||0)+1;
 h.neutralTier=state.tier;h.neutralItem=artifactId;
 h.neutralItemMeta=keeping?{...meta}:{...Inventory.createMeta(h,artifactId),tier:state.tier,curioBoost:old==='dormant_curio'};
 if(artifactId==='enchanters_bauble')h.neutralItemMeta.recrafts=(keeping?meta.recrafts||0:0)+(keeping?1:0);
 const enhancementRules=NEUTRAL_CRAFT_RULES[state.tier].enhancements;
 h.neutralEnchantment=enchantmentId;h.neutralEnchantmentMeta={...Inventory.createMeta(h,enchantmentId),tier:state.tier,rank:enhancementRules.global[enchantmentId]||enhancementRules[h.primaryAttribute||'strength'][enchantmentId]};g._refreshHero(h);return {ok:true,tier:state.tier};
}
function grant(g,h,amount){const available=Math.max(0,madstoneCap(g)-(h.madstoneEarned||0)),received=Math.min(available,amount);h.madstone=(h.madstone||0)+received;h.madstoneEarned=(h.madstoneEarned||0)+received;return amount-received;}
function distribute(g,collector,ancient){
 const team=g.entities.filter(h=>h.kind==='hero'&&h.team===collector.team&&h!==collector);
 let spare=grant(g,collector,ancient?3:2)+(ancient?2:1);
 while(spare>0){const available=team.filter(h=>(h.madstoneEarned||0)<madstoneCap(g));if(!available.length)break;grant(g,available[Math.floor(g._random()*available.length)],1);spare--;}
}
export function campDeath(g,unit,source){
 if(unit.kind!=='neutral'||unit.isRoshan||unit.isTormentor||unit.ownerId||!unit.campId||g.entities.some(e=>e!==unit&&alive(e)&&e.campId===unit.campId))return;
 const nearby=g.entities.filter(h=>h.kind==='hero'&&alive(h)&&distance(h,unit)<=1200),collector=source?.kind==='hero'&&nearby.includes(source)?source:nearby.filter(h=>h.team===source?.team).sort((a,b)=>distance(a,unit)-distance(b,unit))[0];
 const contested=collector&&nearby.some(h=>h.team!==collector.team&&distance(h,unit)<=800);
 if(collector&&!contested)distribute(g,collector,!!unit.ancient);
 else g.madstoneDrops.push({id:g._id('madstone'),x:unit.x,y:unit.y,ancient:!!unit.ancient,expiresAt:g.time+20});
}
export function useGlyph(g,h){
 if(g.paused||g.status!=='playing')return {ok:false,reason:'当前无法使用防御符文'};
 g.glyphStates||=[{rechargeAt:[],cooldownUntil:0},{rechargeAt:[],cooldownUntil:0}];
 const state=g.glyphStates[h.team];state.rechargeAt=state.rechargeAt.filter(t=>t>g.time+1e-7);
 if(state.rechargeAt.length>=2||state.cooldownUntil>g.time+1e-7)return {ok:false,reason:'防御符文尚未准备就绪'};
 state.rechargeAt.push(Math.max(g.time,state.rechargeAt.at(-1)||g.time)+360);state.cooldownUntil=g.time+7;
 for(const e of g.entities)if(alive(e)&&e.team===h.team&&(['tower','barracks','ancient','filler'].includes(e.kind)||e.kind==='creep'))Skills.addStatus(g,e,'glyph',{name:'防御符文',positive:true,invulnerable:true,undispellable:true,duration:e.kind==='creep'?3:7});
 return {ok:true};
}
export function dropWorldItem(g,id,point,fields={}){
 const item=ITEM_BY_ID[id];if(!item)return;
 const e={id:g._id('droppedItem'),kind:'droppedItem',name:item.name,team:2,x:point.x,y:point.y,radius:20,hp:1,maxHp:1,dead:false,itemId:id,meta:{...Inventory.createMeta(g.player,id),...fields}};g.entities.push(e);return e;
}
export function roshanDrops(g,target){
 if(g.roshanDeaths>=2)dropWorldItem(g,'roshans_banner',{x:target.x+80,y:target.y},{level:Math.min(3,g.roshanDeaths-1)});
 // Valve 7.37 defined these daytime drops; 7.38 removed the night Blessing.
 if(g.roshanDeaths>=3&&Math.floor(g.time/300)%2===0){dropWorldItem(g,'cheese',{x:target.x-80,y:target.y});dropWorldItem(g,'refresher_shard',{x:target.x,y:target.y+80});}
}
export function spawnTormentor(g){
 const point=MAP_OBJECTIVES.npc_dota_miniboss_spawner[Math.floor(g.time/300)%2===0?1:0],growth=Math.max(0,Math.floor((g.time-900)/60));
 const e=g._unit('neutral',2,point.x,point.y,{...WORLD_UNITS.tormentor,name:'痛苦魔方',isTormentor:true,ancient:true,unitId:'tormentor',campId:'tormentor',home:{...point},campCenter:{...point},maxHp:4000+50*growth,hpRegen:20+5*growth,tormentorGrowth:growth,damage:0,range:0,speed:0,radius:65,attackCooldown:Infinity,reflectPct:Math.min(30,15+5*g.tormentorDeaths)+1.5*growth});g.entities.push(e);g.tormentorRespawnAt=Infinity;return e;
}
export function tormentorDamage(g,target,value){
 if(!target.isTormentor||value<=0)return;
 const heroes=g.entities.filter(h=>alive(h)&&h.kind==='hero'&&distance(h,target)<=1200);
 for(const h of heroes)g.damage(h,value*target.reflectPct/100/Math.max(1,heroes.length),target,'magical',{reflected:true});
 target.attackedUntil=g.time+10;
}
export function tormentorDeath(g,target,source){
 if(!target.isTormentor)return;
 const previous=g.tormentorDeaths++;g.tormentorRespawnAt=g.time+600;
 const heroes=g.entities.filter(h=>h.kind==='hero'&&h.team===source?.team);
 for(const h of heroes)h.gold+=125+50*previous;
 dropWorldItem(g,'horn_of_battle_greater',{x:target.x+55,y:target.y});
 if(previous>=1){const missing=heroes.filter(h=>!h.consumedShard).sort((a,b)=>a.level-b.level||a.xp-b.xp).slice(0,2);if(missing.length){const h=missing[Math.floor(g._random()*missing.length)];h.consumedShard=true;g._refreshHero(h);}else for(const h of heroes)h.gold+=280;}
}
export function hornWave(g,h){
 for(let lane=0;lane<3;lane++)for(let i=0;i<6;i++){const type=i<4?'Melee':i===4?'Ranged':'Siege',stats={...LANE_CREEPS['mega'+type]},base=LANE_SPAWNS[h.team][lane],gain=type==='Melee'?19:type==='Ranged'?18:0,dmg=type==='Melee'?2:type==='Ranged'?3:0;stats.maxHp+=gain*30;stats.damage+=dmg*30;stats.damageMin+=dmg*30;stats.damageMax+=dmg*30;
  const p=g.navigation.nearestWalkable({x:base.x+i*35,y:base.y});g.entities.push(g._unit('creep',h.team,p.x,p.y,{...stats,hornWave:true,lane,ranged:type!=='Melee',siege:type==='Siege',upgrade:'mega',pathIndex:1,radius:type==='Siege'?32:16,attackType:type==='Siege'?'siege':type==='Ranged'?'pierce':'basic'}));}
}
export function summonDemons(g,h,duration){
 for(let i=0;i<4;i++){const stats=WORLD_UNITS[i<2?'demonMelee':'demonRanged'],point=g.navigation.nearestWalkable({x:h.x+(i-1.5)*60,y:h.y+70});g.entities.push(g._unit('summon',h.team,point.x,point.y,{...stats,ownerId:h.id,nativeKind:'summon',demonicon:true,abilityLevelBonus:2,expiresAt:g.time+duration,radius:24,abilityCooldowns:{},attackType:stats.attackType==='ranged'?'pierce':'basic',manualControl:!!h.isPlayer}));}
}
export function interactObjective(g,h,id){
 const o=g.worldObjectives.find(e=>e.id===id);if(!o||h.dead||distance(h,o)>250||g.isStunned(h))return {ok:false,reason:'请靠近可使用的地图目标'};
 if(o.objectiveType==='outpost'||o.objectiveType==='gate'){h.worldInteraction={objectiveId:id,endsAt:g.time+(o.objectiveType==='outpost'?6:3),start:{x:h.x,y:h.y}};return {ok:true};}
 if(o.objectiveType==='wisdom')return collectWisdom(g,h,o);
 return {ok:false,reason:'该目标当前无法使用'};
}
function collectWisdom(g,h,o){const count=Math.floor(g.time/420);if(count<1||o.collectedPeriod===count)return {ok:false,reason:'智慧圣坛尚未准备就绪'};o.collectedPeriod=count;g._addXp(h,200*count);const ally=g.entities.filter(e=>e.kind==='hero'&&e.team===h.team&&e!==h).sort((a,b)=>a.level-b.level||a.xp-b.xp)[0];if(ally)g._addXp(ally,200*count);return {ok:true};}
function collectRune(g,h,o){
 if(!o.rune)return;const type=o.rune;o.rune=null;
 if(type==='invisibility'){Skills.addStatus(g,h,'invisibilityRune',{name:'隐身神符',positive:true,invisible:true,duration:45,runeDisguiseAt:g.time+2});}
 else if(type==='illusion'){// The shared illusion factory handles ownership and normal attacks.
  g._spawnRuneIllusions?.(h);
 }else if(type==='haste')Skills.addStatus(g,h,'hasteRune',{name:'急速神符',positive:true,duration:22});
 else if(type==='doubleDamage'){Skills.addStatus(g,h,'damageRune',{name:'增强伤害神符',positive:true,duration:45});g._refreshHero(h);}
 else if(type==='regeneration')Skills.addStatus(g,h,'regenRune',{name:'恢复神符',positive:true,regenRune:true,duration:30});
 else if(type==='arcane'){Skills.addStatus(g,h,'arcaneRune',{name:'奥术神符',positive:true,duration:50});g._refreshHero(h);}
}
export function breakRuneInvisibility(g,h){if(h?.statuses?.invisibilityRune)delete h.statuses.invisibilityRune;}
export function runeDamage(g,target,value){if(value>0&&target.statuses?.regenRune)target.statuses.regenRune.regenRuneDamaged=true;}
export function tickWorld(g,dt){
 if(g.time+1e-7>=g.tormentorRespawnAt)spawnTormentor(g);
 for(const t of g.entities)if(t.isTormentor&&alive(t)){const growth=Math.max(0,Math.floor((g.time-900+1e-7)/60)),delta=growth-(t.tormentorGrowth||0);if(delta>0){t.maxHp+=50*delta;t.hp+=50*delta;t.hpRegen+=5*delta;t.reflectPct+=1.5*delta;t.tormentorGrowth=growth;}}
 for(const h of g.entities)if(h.kind==='hero'||h.kind==='illusion'){
  const runeStatState=!h.dead?['damageRune','arcaneRune'].filter(id=>h.statuses?.[id]?.until>g.time).join(','):'';
  if(runeStatState!==(h._runeStatState||'')){h._runeStatState=runeStatState;g._refreshHero(h);}
  const regeneration=h.statuses?.regenRune;if(!h.dead&&regeneration?.until>g.time){const rate=regeneration.regenRuneDamaged?.01:.06;heal(g,h,h.maxHp*rate*dt,h,true);restoreMana(h,h.maxMana*rate*dt);if(h.hp>=h.maxHp&&h.mana>=h.maxMana)delete h.statuses.regenRune;}
  const interaction=h.worldInteraction;if(interaction){if(h.dead||g.isStunned(h)||distance(h,interaction.start)>30)delete h.worldInteraction;else if(g.time>=interaction.endsAt){const o=g.worldObjectives.find(e=>e.id===interaction.objectiveId);if(o?.objectiveType==='outpost')o.team=h.team;else if(o?.objectiveType==='gate'){const other=g.worldObjectives.find(e=>e.objectiveType==='gate'&&e!==o);if(other)g._placeHero(h,other);}delete h.worldInteraction;}}
  const invisible=h.statuses?.invisibilityRune;if(invisible&&invisible.until>g.time){const nearEnemy=g.entities.some(e=>alive(e)&&e.team!==h.team&&e.team!==2&&(['hero','tower','barracks','ancient','fountain'].includes(e.kind))&&distance(e,h)<1025);invisible.smoked=g.time>=invisible.runeDisguiseAt&&!nearEnemy;}
 }
 if(g.time<(g._nextWorldObjectiveTick||0))return;g._nextWorldObjectiveTick=g.time+.25;
 const heroes=g.entities.filter(e=>e.kind==='hero'&&alive(e));
 const sites=g.worldObjectives.filter(e=>e.objectiveType==='powerRune'),period=Math.floor((g.time+1e-7)/120);
 if(period>=3&&sites.some(e=>e.runePeriod!==period)){
  const chosen=Math.floor(g._random()*sites.length);let bag=sites[0].runeBag;
  if(!bag?.length){bag=['invisibility','illusion','haste','doubleDamage','regeneration','arcane'];for(let i=bag.length-1;i>0;i--){const j=Math.floor(g._random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}sites[0].runeBag=bag;}
  const type=bag.pop();for(const [index,site]of sites.entries()){site.runePeriod=period;site.rune=index===chosen?type:null;}
 }
 for(const o of g.worldObjectives){if(o.objectiveType==='wisdom'){const h=heroes.find(h=>distance(h,o)<=90);if(h)collectWisdom(g,h,o);}else if(o.objectiveType==='powerRune'){
  const h=o.rune&&heroes.find(h=>distance(h,o)<80);if(h)collectRune(g,h,o);
 }}
 for(const drop of g.madstoneDrops){const collector=heroes.find(h=>distance(h,drop)<=100);if(collector){distribute(g,collector,drop.ancient);drop.expiresAt=0;}}
 g.madstoneDrops=g.madstoneDrops.filter(d=>d.expiresAt>g.time);
 for(const t of g.entities)if(t.isTormentor&&alive(t)&&t.attackedUntil>g.time)for(const h of heroes)if(distance(h,t)<=1000)g.damage(h,(20+2*Math.max(0,Math.floor((g.time-900)/60)))*.25,t,'magical');
}
