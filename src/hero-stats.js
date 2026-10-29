import { HERO_STATS } from './hero-data.js';
import { ITEM_BY_ID } from './item-data.js';

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
export function calculateHeroStats(heroId, level = 1, inventory = []) {
  const hero = HERO_STATS[heroId];
  if (!hero) throw new RangeError(`Unknown hero: ${heroId}`);
  const actualLevel = Math.max(1, Math.min(30, Math.floor(Number(level) || 1)));
  const bonus = {};
  let bootSpeed = 0;
  for (const entry of inventory) {
    if (!entry) continue;
    const item = typeof entry === 'string' ? ITEM_BY_ID[entry] : entry;
    if (!item) throw new RangeError(`Unknown item: ${entry}`);
    for (const [key, value] of Object.entries(item.stats || {})) {
      // Basic catalog has only flat Boots of Speed; duplicate boots do not stack.
      if (key === 'speed' && item.movementGroup === 'boots') bootSpeed = Math.max(bootSpeed, value);
      else bonus[key] = (bonus[key] || 0) + value;
    }
  }
  const attributes = {};
  for (const attribute of ['strength', 'agility', 'intelligence']) {
    const capitalized = attribute[0].toUpperCase() + attribute.slice(1);
    const base = hero[`base${capitalized}`] + hero[`${attribute}Gain`] * (actualLevel - 1);
    const extra = (bonus[attribute] || 0) + (bonus.allAttributes || 0);
    attributes[attribute] = { base, bonus: extra, total: base + extra, gain: hero[`${attribute}Gain`] };
  }
  const { strength: { total: strength }, agility: { total: agility }, intelligence: { total: intelligence } } = attributes;
  const attributeDamage = hero.primaryAttribute === 'universal'
    ? (strength + agility + intelligence) * ATTRIBUTE_RULES.universalDamagePerAttribute
    : attributes[hero.primaryAttribute].total;
  const damageMin = hero.baseDamageMin + attributeDamage + (bonus.damage || 0);
  const damageMax = hero.baseDamageMax + attributeDamage + (bonus.damage || 0);
  const armor = hero.baseArmor + agility / 6 + (bonus.armor || 0);
  const magicResistance = Math.min(1, hero.baseMagicResistance + intelligence * 0.001);
  const attackSpeed = Math.max(20, Math.min(700, hero.baseAttackSpeed + agility + (bonus.attackSpeed || 0)));
  return {
    heroId, level: actualLevel, primaryAttribute: hero.primaryAttribute,
    strength, agility, intelligence, attributes,
    maxHp: hero.baseHealth + strength * 22 + (bonus.maxHp || 0),
    maxMana: (hero.baseMana + intelligence * 12 + (bonus.maxMana || 0)) * (1+(bonus.maxManaPercent||0)/100),
    hpRegen: hero.baseHealthRegen + strength * 0.1 + (bonus.hpRegen || 0),
    manaRegen: hero.baseManaRegen + intelligence * 0.05 + (bonus.manaRegen || 0),
    damageMin, damageMax, damage: (damageMin + damageMax) / 2,
    armor, magicResistance, physicalResistance: 1 - physicalDamageMultiplier(armor),
    baseAttackTime: hero.baseAttackTime, baseAttackSpeed: hero.baseAttackSpeed,
    attackSpeed, attackInterval: hero.baseAttackTime / (attackSpeed / 100),
    range: hero.range, speed: hero.moveSpeed + bootSpeed + (bonus.speed || 0),
    visionDay: hero.visionDay, visionNight: hero.visionNight,
  };
}
