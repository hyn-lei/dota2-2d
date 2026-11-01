import { ABILITIES, TALENTS } from './ability-data.js';
export function initializeProgression(h){Object.assign(h,{abilityLevels:[0,0,0,0],skillPoints:1,talentPoints:0,talents:[],attributeBonusLevel:0,autocast:h.heroId==='ogre_magi'?{2:false}:{1:true}});return h;}
const fail=reason=>({ok:false,reason});
function point(h){return h.skillPoints>0?{ok:true}:fail('没有可用技能点');}
export function canLearnAbility(h,index){
 const a=ABILITIES[h.heroId]?.[index];if(!a)return fail('无效技能');
 const rank=h.abilityLevels[index];if(rank>=a.maxLevel)return fail('技能已满级');
 if(h.level<a.requiredLevels[rank])return fail(`英雄 ${a.requiredLevels[rank]} 级可学习`);
 return point(h);
}
export function learnAbility(h,index){const result=canLearnAbility(h,index);if(result.ok){h.abilityLevels[index]++;h.skillPoints--;}return result;}
export function canLearnTalent(h,index){
 const talent=TALENTS[h.heroId]?.[index];if(!talent)return fail('无效天赋');
 if(h.talents.includes(index))return fail('已学习此天赋');
 if(h.level<talent.requiredLevel)return fail(`英雄 ${talent.requiredLevel} 级解锁`);
 const other=index^1,lateLevel=27+Math.floor(index/2);
 if(h.talents.includes(other)&&h.level<lateLevel)return fail(`已选择另一侧，${lateLevel} 级解锁`);
 return h.talentPoints>0?{ok:true}:fail('没有可用天赋点');
}
export function learnTalent(h,index){const result=canLearnTalent(h,index);if(result.ok){h.talents.push(index);h.talentPoints--;}return result;}
export function canLearnAttributes(h){
 if(h.attributeBonusLevel>=7)return fail('属性加点已满（7 次）');
 const required=2+h.attributeBonusLevel*2;if(h.level<required)return fail(`英雄 ${required} 级可加属性`);
 return point(h);
}
export function learnAttributes(h){const result=canLearnAttributes(h);if(result.ok){h.attributeBonusLevel++;h.skillPoints--;}return result;}
export function grantLevelPoints(h,previousLevel){
 h.talentPoints||=0;
 const abilityBudget=ABILITIES[h.heroId].reduce((n,a)=>n+a.maxLevel,0)+7;
 for(let level=Math.max(1,previousLevel)+1;level<=Math.min(30,h.level);level++){
  if(h.skillPoints+h.abilityLevels.reduce((n,r)=>n+r,0)+h.attributeBonusLevel<abilityBudget)h.skillPoints++;
  if([10,15,20,25,27,28,29,30].includes(level))h.talentPoints++;
  if(level>=27){const first=(level-27)*2,chosen=h.talents.includes(first)?first:h.talents.includes(first+1)?first+1:null;if(chosen!==null)learnTalent(h,chosen^1);}
 }
}
const priorities={juggernaut:[0,2,1],crystal_maiden:[0,1,2],windranger:[1,2,0],axe:[2,0,1],kunkka:[1,0,2],ogre_magi:[1,0,2]};
export function autoLearn(h){
 for(let tier=3;tier>=0;tier--)if(h.talentPoints>0&&h.level>=[10,15,20,25][tier]&&!h.talents.some(i=>Math.floor(i/2)===tier))learnTalent(h,tier*2+(h.heroId==='kunkka'?1:0));
 let iterations=40;while(h.skillPoints>0&&iterations--){
  if(canLearnAbility(h,3).ok){learnAbility(h,3);continue;}
  const tier=h.talentPoints>0?[3,2,1,0].find(t=>h.level>=[10,15,20,25][t]&&!h.talents.some(i=>Math.floor(i/2)===t)):undefined;
  if(tier!==undefined){learnTalent(h,tier*2+(h.heroId==='kunkka'?1:0));continue;}
  const order=priorities[h.heroId];
  const missing=order.find(i=>h.abilityLevels[i]===0&&canLearnAbility(h,i).ok);
  const skill=missing!==undefined?missing:order.find(i=>canLearnAbility(h,i).ok);
  if(skill!==undefined){learnAbility(h,skill);continue;}
  const late=h.talentPoints>0?TALENTS[h.heroId].findIndex((_,i)=>canLearnTalent(h,i).ok):-1;
  if(late>=0){learnTalent(h,late);continue;}
  if(canLearnAttributes(h).ok){learnAttributes(h);continue;}break;
 }
}
