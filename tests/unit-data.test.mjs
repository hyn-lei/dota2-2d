import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING_STATS, NEUTRAL_UNITS, CAMP_GROUPS, FLOODED_CAMP_GROUPS, LANE_CREEPS, RULES, ROSHAN, NEUTRAL_ABILITIES, getFloodedCampGroup, floodedTier } from '../src/unit-data.js';

test('source building values retain tier differences and barracks reinforcement', () => {
  assert.deepEqual([1,2,3,4].map(t=>BUILDING_STATS[`tower${t}`].maxHp), [1800,2500,2500,2600]);
  assert.deepEqual([1,2,3,4].map(t=>BUILDING_STATS[`tower${t}`].armor), [12,16,16,21]);
  assert.equal(BUILDING_STATS.tower4.armorPerStandingBarracks,4);
  assert.equal(BUILDING_STATS.barracksMelee.hpRegen,5);
  assert.equal(BUILDING_STATS.barracksRanged.hpRegen,0);
  assert.equal(BUILDING_STATS.ancient.maxHp,4500);
  assert.equal(BUILDING_STATS.filler.bounty,68);
  assert.equal(BUILDING_STATS.fountain.invulnerable,true);
});
test('neutral attack interval includes base attack speed', () => {
  assert.equal(NEUTRAL_UNITS.kobold.maxHp,240);
  assert.equal(NEUTRAL_UNITS.kobold.damageMin,15);
  assert.equal(NEUTRAL_UNITS.kobold.attackInterval,1);
  assert.ok(Math.abs(NEUTRAL_UNITS.centaur_khan.attackInterval-2/1.35)<1e-12);
  assert.equal(NEUTRAL_UNITS.black_dragon.maxHp,2000);
  assert.equal(NEUTRAL_UNITS.black_dragon.magicResistance,.3);
});
test('all camp compositions resolve to complete neutral definitions', () => {
  assert.deepEqual(Object.values(CAMP_GROUPS).map(groups=>groups.length),[6,5,6,5]);
  for(const group of [...Object.values(CAMP_GROUPS).flat(),...Object.values(FLOODED_CAMP_GROUPS)]) {
    assert.ok(group.reduce((n,u)=>n+u.count,0)>=2);
    for(const entry of group) {
      assert.ok(NEUTRAL_UNITS[entry.unitId],entry.unitId);
      assert.ok(Number.isInteger(entry.count)&&entry.count>0);
    }
  }
  for(const group of CAMP_GROUPS.ancient)for(const {unitId}of group)assert.equal(NEUTRAL_UNITS[unitId].ancient,true);
  assert.equal(CAMP_GROUPS.small[0].reduce((n,u)=>n+u.count,0),5);
  assert.equal(FLOODED_CAMP_GROUPS.ancient.reduce((n,u)=>n+NEUTRAL_UNITS[u.unitId].xpBounty*u.count,0),312);
});
test('lane values and runtime limitations are explicit', () => {
  assert.equal(LANE_CREEPS.melee.maxHp,550);
  assert.equal(LANE_CREEPS.ranged.xpBounty,69);
  assert.equal(LANE_CREEPS.flagbearer.xpBounty,60);
  assert.equal(LANE_CREEPS.siege.magicResistance,.8);
  assert.equal(LANE_CREEPS.megaMelee.requiresEngineUpgrade,true);
  assert.equal(RULES.laneWaveInterval,30);
  assert.equal(RULES.firstNeutralSpawn,60);
});
test('flooded camps upgrade one unit each five minutes and honor 7.41 per-camp caps', () => {
  const small={initialTier:0,sourceId:'neutralcamp_good_14'};
  assert.deepEqual(getFloodedCampGroup(small,0),[{unitId:'tadpole',count:3}]);
  assert.equal(getFloodedCampGroup(small,300).find(u=>u.unitId==='froglet').count,1);
  assert.equal(floodedTier(small,899),0);
  assert.equal(floodedTier(small,900),1);
  assert.deepEqual(getFloodedCampGroup(small,1800),FLOODED_CAMP_GROUPS.large);
  assert.deepEqual(getFloodedCampGroup({initialTier:1,sourceId:'neutralcamp_good_11'},3600),FLOODED_CAMP_GROUPS.large);
  assert.deepEqual(getFloodedCampGroup({initialTier:1,sourceId:'neutralcamp_good_4'},1800),FLOODED_CAMP_GROUPS.ancient);
});
test('neutral growth and Roshan values are traceable to source abilities', () => {
  assert.equal(RULES.neutralUpgrade.interval,450);
  assert.equal(NEUTRAL_ABILITIES.neutral_upgrade.values.increase_armor,'0.5');
  assert.equal(ROSHAN.maxHp,6000);
  assert.equal(ROSHAN.magicResistance,.55);
  for(const record of [...Object.values(NEUTRAL_UNITS),...Object.values(BUILDING_STATS),...Object.values(LANE_CREEPS),ROSHAN]) {
    assert.ok(Number.isFinite(record.attackInterval));
    assert.ok(record.magicResistance>=0&&record.magicResistance<=1);
    assert.equal(record.damage,(record.damageMin+record.damageMax)/2);
  }
});
