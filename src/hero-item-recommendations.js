import {HERO_ITEM_BUILDS} from './hero-item-builds.js';
import {ITEM_BY_ID} from './item-data.js';

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
 ultimate_scepter:'升级本英雄的神杖技能效果。'
};
const heroReasons={
 weaver:{desolator:'减甲增强普攻与连击，适合物理爆发。',greater_crit:'连击也能触发暴击，提高物理爆发。'},
 axe:{blink:'跳刀切入接狂战士之吼，先手控住多人。',blade_mail:'配合嘲讽反弹伤害，强化近身团战。'},
 chaos_knight:{armlet:'力量与攻击加成强化本体和幻象输出。',manta:'分身配合幻象体系，增加输出与驱散。'},
 chen:{mekansm:'治疗队友与受控军队，支撑多人推进。'},
 crystal_maiden:{glimmer_cape:'改善施法生存，也能隐身救援队友。'}
};
function merged(entries){
 const items=new Map();
 for(const entry of entries)if(ITEM_BY_ID[entry.id]?.purchasable){
  const current=items.get(entry.id);if(current)current.quantity+=entry.quantity;else items.set(entry.id,{...entry});
 }
 return [...items.values()];
}
export function heroItemRecommendations(heroId){
 const build=HERO_ITEM_BUILDS[heroId];if(!build)return [];
 const core=merged([...build.mid,...build.late]);
 // Weaver's client guide lists Desolator as an alternative physical build.
 if(heroId==='weaver'){
  const desolator=build.situational.find(e=>e.id==='desolator');if(desolator&&!core.some(e=>e.id===desolator.id))core.unshift({...desolator});
  const order=['desolator','greater_crit','black_king_bar'];core.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99));
 }
 const annotate=entries=>entries.map(entry=>({...entry,reason:heroReasons[heroId]?.[entry.id]||reasons[entry.id]||
  (ITEM_BY_ID[entry.id].cost<=600?'补齐对线属性、续航或视野。':'补充本英雄的属性、主动效果或作战能力。')}));
 return [{id:'core',label:'核心',items:annotate(core)},
  {id:'early',label:'前期',items:annotate(merged([...build.starting,...build.early]))},
  {id:'situational',label:'备选',items:annotate(merged(build.situational))}];
}
