import {HERO_ITEM_BUILDS} from './hero-item-builds.js';
import {ITEM_BY_ID} from './item-data.js';
import {BOT_DRAFT_PROFILES,DRAFT_ROLES} from './bot-draft.js';
import {PROFESSIONAL_ITEM_BUILDS,WORKSHOP_ITEM_BUILDS} from './current-hero-item-builds.js';

const reasons={
 desolator:'削减目标护甲，增强物理爆发与推塔。',greater_crit:'提高普攻暴击，放大物理输出。',
 black_king_bar:'应对密集控制，争取持续输出时间。',sphere:'抵挡定向技能，保护切入与撤退。',
 power_treads:'补齐攻速与属性，切换属性兼顾输出和续航。',magic_wand:'积攒充能，及时补充生命与魔法。',
 maelstrom:'连锁闪电加快清线、刷野与输出。',mjollnir:'提高攻速与闪电伤害，对抗密集单位。',
 butterfly:'增加敏捷、攻速和闪避，强化物理核心。',satanic:'依靠普攻吸血，关键时刻恢复生命。',
 monkey_king_bar:'克制闪避，让普攻伤害更稳定。',nullifier:'驱散目标增益，限制保命装备。',
 manta:'分身增加输出，并提供驱散与躲避机会。',dragon_lance:'增加射程和属性，改善远程输出位置。',
 blink:'快速切入或调整位置，衔接先手技能。',blade_mail:'反弹伤害，让敌人攻击时付出代价。',
 heart:'提高生命与恢复，承担前排压力。',glimmer_cape:'提供隐身与魔法保护，救援自己或队友。',
 force_staff:'推行脱离危险，也可帮助队友调整位置。',sheepstick:'提供可靠的变羊控制，限制关键目标。',
 pipe:'保护队伍，应对较多魔法伤害。',assault:'提供攻速与护甲光环，强化团战和推塔。',
 guardian_greaves:'为队伍恢复生命与魔法，改善持续作战。',mekansm:'提供团队治疗，支撑推进和团战。',
 bfury:'分裂和恢复提高近战核心的刷钱效率。',armlet:'切换力量与攻击属性，提升近战爆发。',
 echo_sabre:'提供连击和减速，强化近身输出。',aghanims_shard:'强化本英雄的魔晶技能效果。',
 ultimate_scepter:'升级本英雄的神杖技能效果。',orchid:'用沉默限制对手反打或逃生，衔接队伍的爆发。',
 bloodthorn:'沉默关键目标，配合队友和幻象集中攻击。',soul_ring:'消耗少量生命换取临时魔法，以便更常施法。',
 urn_of_shadows:'击杀附近敌方英雄后获得充能，用于治疗队友或消耗对手。',
 essence_distiller:'延续影之灵龛的治疗和消耗，可预先布置在地面。',consecrated_wraps:'承受英雄伤害时消耗充能生成屏障，改善游走生存。',
 lotus_orb:'为队友施加驱散与法术反射，应对敌方先手。',pavise:'为队友提供物理伤害屏障，减少被集火的风险。',
 solar_crest:'兼顾保护、攻速和护甲，适合支援持续普攻的队友。',aeon_disk:'受到集火时触发防护，为撤退或等候援助争取时间。',
 skadi:'普攻减速并压低治疗收益，适合延长交战和限制对手撤退。',hurricane_pike:'提升射程并拉开近身敌人，维持安全的输出距离。',
 aether_lens:'增加施法距离，在队友后方提供控制和救援。',orb_of_frost:'普攻减速，帮助对线留人。'
};
const {corruption_armor:desolatorArmor}=ITEM_BY_ID.desolator.values;
const {crit_chance:daedalusChance,crit_multiplier:daedalusDamage}=ITEM_BY_ID.greater_crit.values;
const heroReasons={
 weaver:{desolator:`削减 ${Math.abs(desolatorArmor)} 点护甲，普攻和连击更容易打出物理爆发。`,greater_crit:`普攻和连击有 ${daedalusChance}% 概率打出 ${daedalusDamage}% 暴击，适合持续普攻的局面。`},
 axe:{blink:'跳刀切入接狂战士之吼，先手控住多人。',blade_mail:'配合嘲讽反弹伤害，强化近身团战。'},
 chaos_knight:{armlet:'力量与攻击加成强化本体和幻象输出。',manta:'分身配合幻象体系，增加输出与驱散。'},
 chen:{mekansm:'治疗队友与受控军队，支撑多人推进。'},
 crystal_maiden:{glimmer_cape:'改善施法生存，也能隐身救援队友。'}
};

const defaultRoles={weaver:'carry',chaos_knight:'carry',juggernaut:'carry',crystal_maiden:'support',windranger:'mid',axe:'offlane',ogre_magi:'support',kunkka:'mid',chen:'support',drow_ranger:'carry'};

export const recommendationPhase=time=>time>=1500?'late':time>=600?'mid':'early';

export function shopRecommendationContext(player,lineup,time,fulfilled=()=>false){
 const enemies=lineup.filter(hero=>hero.kind==='hero'&&hero.team!==player.team).map(hero=>hero.heroId);
 return {
  role:DRAFT_ROLES.includes(player.draftRole)?player.draftRole:defaultRoles[player.heroId],
  phase:recommendationPhase(time),
  invisibility:enemies.includes('weaver'),
  control:enemies.filter(id=>BOT_DRAFT_PROFILES[id]?.control>=2).length>=3,
  armor:enemies.includes('axe')||enemies.includes('chen'),
  fulfilled
 };
}

function situationalResponses(context){
 const {role,phase,invisibility,control,armor,fulfilled}=context;
 const support=role==='roamer'||role==='support',late=phase==='late';
 const responses=[];
 const add=(id,reason)=>{if(ITEM_BY_ID[id]?.purchasable)responses.push({id,reason,quantity:1});};
 if(invisibility){
  if(support)add('ward_sentry','在对线、入口和战场布置真视，防范编织者的缩地隐身。');
  else add('dust','交战前备好显影之尘，留住试图用缩地撤退的编织者。');
 }
 if(control&&phase!=='early'){
  if(support&&late)add('lotus_orb','队伍面对多名控制英雄时，可施放到队友身上，驱散可移除效果并反弹定向技能。');
  else if(support)add('force_staff','遇到密集控制时，为还能移动的队友调整位置，拉开后续技能的距离。');
  else add('black_king_bar','敌方有多名控制英雄。进场前开启减益免疫，争取持续输出时间，留意可穿透的技能。');
 }
 if(armor&&phase!=='early'){
  if(support)add('veil_of_discord','敌方有提高护甲的技能，可用法术吸血和法术增强支撑法术输出。');
  else if(late)add('assault','针对敌方护甲增益，以减甲光环支援团队的物理伤害，兼顾友军护甲。');
  else add('maelstrom','敌方能提高护甲时，连锁闪电补充不受护甲影响的魔法伤害。');
 }
 const pending=[],owned=[];
 for(const response of responses)(fulfilled(response.id,response.quantity)?owned:pending).push(response);
 return [...pending,...owned];
}

function merged(entries){
 const items=new Map();
 for(const entry of entries)if(ITEM_BY_ID[entry.id]?.purchasable){
  const current=items.get(entry.id);if(current)current.quantity+=entry.quantity;else items.set(entry.id,{...entry});
 }
 return [...items.values()];
}
function promote(entries,preferred){
 const baseline=new Map(entries.map(entry=>[entry.id,entry]));
 const ranked=[];
 for(const entry of preferred){
  if(!ITEM_BY_ID[entry.id]?.purchasable)continue;
  const original=baseline.get(entry.id);
  ranked.push({...original,...entry,quantity:Math.max(original?.quantity??1,entry.quantity??1)});
  baseline.delete(entry.id);
 }
 return [...ranked,...baseline.values()];
}

export function heroItemRecommendations(heroId,context){
 const build=HERO_ITEM_BUILDS[heroId];if(!build)return [];
 const core=merged([...build.mid,...build.late]);
 // Weaver's client guide lists Desolator as an alternative physical build.
 if(heroId==='weaver'){
  const desolator=build.situational.find(e=>e.id==='desolator');if(desolator&&!core.some(e=>e.id===desolator.id))core.unshift({...desolator});
  const order=['desolator','greater_crit','black_king_bar'];core.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99));
 }
 const role=context?.role||defaultRoles[heroId],buildKey=`${heroId}:${role}`;
 const observed=PROFESSIONAL_ITEM_BUILDS.builds[buildKey],guide=WORKSHOP_ITEM_BUILDS.builds[buildKey];
 const evidence=stage=>(observed?.[stage]||[]).map(({id,...sample})=>({id,evidence:{...sample,patch:PROFESSIONAL_ITEM_BUILDS.patch,sampleCount:observed.sampleCount}}));
 const guideItems=stage=>(guide?.[stage]||[]).map(([id,quantity])=>({id,quantity,evidence:{patch:WORKSHOP_ITEM_BUILDS.patch,author:WORKSHOP_ITEM_BUILDS.author,workshopId:guide.workshopId}}));
 const guideOrder=(stage,items)=>promote(items,guideItems(stage));
 const withObservations=(stage,items)=>{
  const fromGuide=guideOrder(stage,items);
  const observations=evidence(stage).map(entry=>{
   const workshopId=fromGuide.find(item=>item.id===entry.id)?.evidence?.workshopId;
   return workshopId?{...entry,evidence:{...entry.evidence,workshopId}}:entry;
  });
  return promote(fromGuide,observations);
 };
 const annotate=entries=>entries.map(entry=>({...entry,reason:entry.reason||heroReasons[heroId]?.[entry.id]||reasons[entry.id]||
  (ITEM_BY_ID[entry.id].cost<=600?'补齐对线属性、续航或视野。':'补充本英雄的属性、主动效果或作战能力。')}));
 return [{id:'core',label:'核心',items:annotate(withObservations('core',core))},
  {id:'early',label:'前期',items:annotate(withObservations('early',merged([...build.starting,...build.early])))},
  {id:'situational',label:'备选',items:annotate(promote(guideOrder('situational',merged(build.situational)),context?situationalResponses(context):[]))}];
}
