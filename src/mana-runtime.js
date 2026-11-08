// Temporary mana is spent first; ordinary regeneration cannot refill that pool.
const pools=h=>Object.values(h.statuses||{}).filter(s=>s.temporaryMana!==undefined);
export function manaState(h){
 const records=pools(h),temporary=records.reduce((n,s)=>n+(s.temporaryMana||0),0),capacity=records.reduce((n,s)=>n+(s.manaCapacity||0),0);
 const base=Math.max(0,(h.maxMana||0)-capacity);
 return {temporary,capacity,normalRatio:base?Math.max(0,(h.mana||0)-temporary)/base:0};
}
export function spendMana(h,amount){
 const spent=Math.min(h.mana||0,Math.max(0,amount));let remaining=spent;
 for(const s of pools(h).sort((a,b)=>a.until-b.until)){const used=Math.min(remaining,s.temporaryMana||0);s.temporaryMana-=used;remaining-=used;if(remaining<=0)break;}
 h.mana=Math.max(0,(h.mana||0)-spent);return spent;
}
export function restoreMana(h,amount){
 const {temporary,capacity}=manaState(h),limit=(h.maxMana||0)-capacity+temporary,before=h.mana||0;
 h.mana=Math.max(before,Math.min(limit,before+Math.max(0,amount)));return h.mana-before;
}
export function restoreManaRatio(h,previous){
 const {temporary,capacity}=manaState(h);
 h.mana=Math.max(0,Math.min(h.maxMana,previous.normalRatio*(h.maxMana-capacity)+temporary));
}
export function grantTemporaryMana(h,status,amount){
 status.temporaryMana=amount;status.manaCapacity=Math.max(0,h.mana+amount-h.maxMana);
 h.maxMana+=status.manaCapacity;h.mana+=amount;
}
export function expireTemporaryMana(h,status){
 if(status.temporaryMana===undefined)return;
 h.maxMana=Math.max(0,h.maxMana-(status.manaCapacity||0));
 h.mana=Math.max(0,Math.min(h.maxMana,h.mana-status.temporaryMana));
}
export function clearTemporaryMana(h){
 for(const s of pools(h))expireTemporaryMana(h,s);
}
