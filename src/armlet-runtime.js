import {ATTRIBUTE_RULES} from './hero-stats.js';
const target=e=>e.item.values.unholy_bonus_strength;
export function toggleArmlet(g,h,e){
 const on=e.meta.mode!=='on';e.meta.mode=on?'on':'off';e.meta.armletStrength=0;
 g._refreshHero(h);
}
export function tickArmlet(g,h,e,dt){
 if(e.meta.mode!=='on'||h.dead)return;
 // Legacy active saves already contain the complete strength bonus.
 const old=e.meta.armletStrength??target(e);
 const next=Math.min(target(e),old+target(e)*dt/.6);
 if(next!==old){e.meta.armletStrength=next;g._refreshHero(h);}
}
export const armletHealthBonus=items=>items.reduce((sum,i)=>sum+(i.id==='armlet'?(i.stats.strength||0)*ATTRIBUTE_RULES.healthPerStrength:0),0);
export function refreshedHealth(h,oldRatio,oldArmletBonus){
 const delta=(h.armletHealthBonus||0)-oldArmletBonus;
 return h.dead?0:Math.max(delta?1:Number.EPSILON,Math.min(h.maxHp,oldRatio*(h.maxHp-delta)+delta));
}
