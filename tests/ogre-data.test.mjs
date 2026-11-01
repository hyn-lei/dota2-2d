import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HERO_STATS } from '../src/hero-data.js';
import { calculateHeroStats } from '../src/hero-stats.js';
import { ABILITIES, INNATES, TALENTS, abilityAt, innateAt } from '../src/ability-data.js';
import { EXTRA_ABILITIES } from '../src/upgrade-data.js';

const feed=JSON.parse(readFileSync(new URL('../docs/research/heroes/84.json',import.meta.url))).result.data.heroes[0];
test('Ogre is generated from official hero ID 84 with all four abilities and eight talents',()=>{
  assert.equal(HERO_STATS.ogre_magi?.dotaId,84);
  assert.deepEqual(ABILITIES.ogre_magi?.map(s=>s.id),['ogre_magi_fireblast','ogre_magi_ignite','ogre_magi_bloodlust','ogre_magi_multicast']);
  assert.equal(INNATES.ogre_magi?.id,'ogre_magi_dumb_luck');assert.equal(TALENTS.ogre_magi?.length,8);
});
test('Ogre rank data matches the saved Valve feed without copied constants',()=>{
  assert.ok(ABILITIES.ogre_magi);
  for(const record of ABILITIES.ogre_magi){
    const original=feed.abilities.find(a=>a.name===record.id);
    assert.deepEqual(record.cooldowns,original.cooldowns);assert.deepEqual(record.manaCosts,original.mana_costs);assert.deepEqual(record.castRanges,original.cast_ranges);
    for(const value of original.special_values)assert.deepEqual(record.values[value.name],value.values_float);
  }
});
test('Ogre has zero intellect and receives the innate strength mana and regeneration',()=>{
  assert.ok(HERO_STATS.ogre_magi);
  const h=calculateHeroStats('ogre_magi');
  assert.equal(h.strength,26);assert.equal(h.agility,14);assert.equal(h.intelligence,0);
  assert.equal(h.maxHp,feed.max_health);assert.equal(h.damageMin,feed.damage_min);assert.equal(h.damageMax,feed.damage_max);
  assert.equal(h.maxMana,120+26*6);assert.ok(Math.abs(h.manaRegen-.52)<1e-7);
  const equipped=calculateHeroStats('ogre_magi',1,[{stats:{intelligence:100,strength:10,maxMana:175,manaRegen:2}}]);
  assert.deepEqual(equipped.attributes.intelligence,{base:0,bonus:0,total:0,gain:0});
  assert.equal(equipped.maxMana,120+36*6+175);assert.ok(Math.abs(equipped.manaRegen-2.72)<1e-7);
});
test('Ogre talents and both upgrades affect the correct official fields',()=>{
  assert.ok(ABILITIES.ogre_magi);
  assert.equal(abilityAt('ogre_magi',0,4,[5]).damage,425);
  assert.equal(abilityAt('ogre_magi',0,4,[],{hasScepter:true}).cooldown,7);
  assert.equal(abilityAt('ogre_magi',0,4,[],{hasScepter:true}).values.bonus_cast_speed,25);
  assert.equal(innateAt('ogre_magi',10,[1]).values.mana_per_str,8);
  assert.equal(innateAt('ogre_magi',10,[1]).values.mana_regen_per_str,.03);
  assert.equal(TALENTS.ogre_magi[2].effects[0].stat,'damage');
  assert.deepEqual(EXTRA_ABILITIES.ogre_magi.map(s=>[s.id,s.upgrade]),[['ogre_magi_unrefined_fireblast','scepter'],['ogre_magi_smash','shard']]);
});
