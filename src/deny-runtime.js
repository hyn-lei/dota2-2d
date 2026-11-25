const alive=unit=>unit&&!unit.dead&&unit.hp>0;

export const isLaneCreep=unit=>unit?.kind==='creep'&&[0,1].includes(unit.team)&&
 Number.isInteger(unit.lane)&&unit.lane>=0&&unit.lane<=2&&!unit.ownerId&&!unit.dominatedBy;

// Valve's tutorial says "below half". Exact client boundary and modifier
// exceptions remain in docs/deny-runtime-sources.md for later sampling.
export function canDenyTarget(source,target,owner=source){
 return !!(source&&alive(target)&&source.team===target.team&&isLaneCreep(target)&&
  owner?.kind==='hero'&&owner.team===source.team&&target.hp<target.maxHp*.5);
}

export function canAttackTarget(source,target,owner=source){
 return !!(alive(source)&&alive(target)&&(source.team!==target.team||canDenyTarget(source,target,owner)));
}
