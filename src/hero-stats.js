import { HERO_STATS } from './hero-data.js';
import { ITEM_BY_ID } from './item-data.js';
import { innateAt } from './ability-data.js';

// Indexed by CURRENT hero level. Official 7.32 progression; level 30 is capped.
export const XP_TO_NEXT = Object.freeze([0, 240, 400, 520, 600, 680, 760, 800, 900, 1000,
  1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600,
  2800, 3000, 4000, 5000, 6000, 7000, 8000, 0]);

export const ATTRIBUTE_RULES = Object.freeze({
  healthPerStrength: 22, healthRegenPerStrength: 0.1,
  armorPerAgility: 1 / 6, attackSpeedPerAgility: 1,
  manaPerIntelligence: 12, manaRegenPerIntelligence: 0.05,
  magicResistancePerIntelligence: 0.001, universalDamagePerAttribute: 0.45,
});

/** Fraction of incoming physical damage after armor; supports negative armor. */
export function physicalDamageMultiplier(armor = 0) {
  return 1 - (0.06 * armor) / (1 + 0.06 * Math.abs(armor));
}

/** Resistance is a fraction, e.g. 0.28 means 28%. */
export function magicalDamageMultiplier(resistance = 0) {
  return Math.max(0, 1 - resistance);
}

/** Natural growth + equipment. Talents, innates and temporary buffs are separate. */
export function calculateHeroStats(heroId, level = 1, inventory = [], options = {}) {
  const hero = HERO_STATS[heroId];
  if (!hero) throw new RangeError(`Unknown hero: ${heroId}`);
  const actualLevel = Math.max(1, Math.min(30, Math.floor(Number(level) || 1)));
  const bonus = {};
  let bootSpeed = 0, itemMagicMultiplier=1,evasionMultiplier=1;const unique={};
  for (const entry of inventory) {
    if (!entry) continue;
    const item = typeof entry === 'string' ? ITEM_BY_ID[entry] : entry;
    if (!item) throw new RangeError(`Unknown item: ${entry}`);
    for (const [key, value] of Object.entries(item.stats || {})) {
      // Basic catalog has only flat Boots of Speed; duplicate boots do not stack.
      if(key==='magicResistance')itemMagicMultiplier*=1-value/100;
      else if(key==='evasion')evasionMultiplier*=1-value/100;
      else if(['castRange','cooldownReduction','statusResistance','slowResistance','castSpeed','manaCostReduction','spellAoE','moveSpeedPct','healthRegenAmp','manaRegenAmp','attackRange'].includes(key))bonus[key]=Math.max(bonus[key]||0,value);
      else if((key==='spellAmp'&&['kaya','kaya_and_sange','yasha_and_kaya'].includes(item.id))||(key==='speed'&&item.id==='wind_lace')){const group=key+':'+(item.id==='wind_lace'?'windlace':'kaya');const old=unique[group]||0;unique[group]=Math.max(old,value);bonus[key]=(bonus[key]||0)+unique[group]-old;}
      else if (key === 'speed' && item.movementGroup === 'boots') bootSpeed = Math.max(bootSpeed, value);
      else bonus[key] = (bonus[key] || 0) + value;
    }
  }
  const attributes = {};
  for (const attribute of ['strength', 'agility', 'intelligence']) {
    const capitalized = attribute[0].toUpperCase() + attribute.slice(1);
    const base = hero[`base${capitalized}`] + hero[`${attribute}Gain`] * (actualLevel - 1);
    const extra = (bonus[attribute] || 0) + (bonus.allAttributes || 0);
    attributes[attribute] = heroId==='ogre_magi'&&attribute==='intelligence'?{base:0,bonus:0,total:0,gain:0}:{ base, bonus: extra, total: base + extra, gain: hero[`${attribute}Gain`] };
  }
  const { strength: { total: strength }, agility: { total: agility }, intelligence: { total: intelligence } } = attributes;
  const attributeDamage = hero.primaryAttribute === 'universal'
    ? (strength + agility + intelligence) * ATTRIBUTE_RULES.universalDamagePerAttribute
    : attributes[hero.primaryAttribute].total;
  const damageMin = hero.baseDamageMin + attributeDamage + (bonus.damage || 0);
  const damageMax = hero.baseDamageMax + attributeDamage + (bonus.damage || 0);
  const armor = hero.baseArmor + agility / 6 + (bonus.armor || 0);
  const magicResistance = 1-(1-Math.min(1, hero.baseMagicResistance + intelligence * 0.001))*itemMagicMultiplier;
  const attackSpeed = Math.max(20, Math.min(700, hero.baseAttackSpeed + agility + (bonus.attackSpeed || 0)));
  const dumbLuck=heroId==='ogre_magi'?innateAt(heroId,actualLevel,options.talents||[],options).values:null;
  return {
    heroId, level: actualLevel, primaryAttribute: hero.primaryAttribute,
    strength, agility, intelligence, attributes,
    maxHp: hero.baseHealth + strength * 22 + (bonus.maxHp || 0),
    maxMana: (hero.baseMana + intelligence * 12 + (dumbLuck?strength*dumbLuck.mana_per_str:0) + (bonus.maxMana || 0)) * (1+(bonus.maxManaPercent||0)/100),
    hpRegen: (hero.baseHealthRegen + strength * 0.1 + (bonus.hpRegen || 0))*(1+(bonus.healthRegenAmp||0)/100),
    manaRegen: (hero.baseManaRegen + intelligence * 0.05 + (dumbLuck?strength*dumbLuck.mana_regen_per_str:0) + (bonus.manaRegen || 0))*(1+(bonus.manaRegenAmp||0)/100),
    damageMin, damageMax, damage: (damageMin + damageMax) / 2,
    armor, magicResistance, physicalResistance: 1 - physicalDamageMultiplier(armor),
    baseAttackTime: hero.baseAttackTime, baseAttackSpeed: hero.baseAttackSpeed,attackPoint:hero.attackPoint||0,
    attackSpeed, attackInterval: hero.baseAttackTime / (attackSpeed / 100),
    range: hero.range+(bonus.attackRange||0), speed: Math.min(550,(hero.moveSpeed + bootSpeed + (bonus.speed || 0))*(1+(bonus.moveSpeedPct||0)/100)),
    visionDay: hero.visionDay, visionNight: hero.visionNight,
    castRangeBonus:bonus.castRange||0,spellAmp:bonus.spellAmp||0,cooldownReduction:bonus.cooldownReduction||0,
    lifesteal:bonus.lifesteal||0,spellLifesteal:bonus.spellLifesteal||0,statusResistance:bonus.statusResistance||0,evasion:(1-evasionMultiplier)*100,
    slowResistance:bonus.slowResistance||0,spellAoE:bonus.spellAoE||0,manaCostReduction:bonus.manaCostReduction||0,castSpeed:bonus.castSpeed||0,
    healAmp:bonus.healAmp||0,
  };
}
