// User-requested custom talent; kept separate from the Valve hero/ability snapshots.
export const ZEALOT_GROWTH_ID='chen_zealot_growth';
export const ZEALOT_GROWTH_LIMITS=Object.freeze({armor:50,magicResistancePct:60,attackSpeed:400});
export const ZEALOT_GROWTH_DESCRIPTION='陈每次升级，狂热者按陈升级后的等级获得攻击伤害 +1 × 等级、护甲 +0.5 × 等级、魔法抗性 +1% × 等级、攻击速度 +5 × 等级。每次加成累加，攻击伤害加成无上限，护甲加成上限 50，魔抗加成上限 60%，攻速加成上限 400。狂热者重生后继承陈当前等级的累计成长。';
export function zealotGrowthAt(heroLevel=1){
 const level=Math.max(1,Math.min(30,Math.floor(Number(heroLevel))||1));
 const total=level*(level+1)/2-1;
 return {level,stacks:level-1,damage:total,armor:Math.min(ZEALOT_GROWTH_LIMITS.armor,total*.5),magicResistancePct:Math.min(ZEALOT_GROWTH_LIMITS.magicResistancePct,total),attackSpeed:Math.min(ZEALOT_GROWTH_LIMITS.attackSpeed,total*5)};
}
