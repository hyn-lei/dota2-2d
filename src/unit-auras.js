import {NEUTRAL_ABILITIES, RULES} from './unit-data.js';
const data=NEUTRAL_ABILITIES.flagbearer_creep_aura_effect.values;
export const flagbearerMagicResistance=time=>Math.min(Number(data.maximum_intervals),Math.max(0,Math.floor(time/RULES.laneUpgradeInterval)))*Number(data.bonus_magic_resistance_per_interval);
// Read live positions/deaths. A caller may supply this tick's ability sources;
// multiple flagbearers grant the same aura once, including to themselves.
export function flagbearerAura(g,unit,sources=g.entities){
 if(unit.kind!=='creep'||unit.dead||unit.hp<=0)return null;
 const source=sources.find(e=>e.kind==='creep'&&!e.dead&&e.hp>0&&e.team===unit.team&&e.abilities?.includes('flagbearer_creep_aura_effect')&&Math.hypot(e.x-unit.x,e.y-unit.y)<=Number(data.radius));
 return source?{sourceId:source.id,hpRegen:Number(data.bonus_health_regen),magicResistance:flagbearerMagicResistance(g.time)/100}:null;
}
