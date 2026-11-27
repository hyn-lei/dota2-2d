const alive=unit=>unit&&!unit.dead&&unit.hp>0;

export const isLaneCreep=unit=>unit?.kind==='creep'&&[0,1].includes(unit.team)&&
 Number.isInteger(unit.lane)&&unit.lane>=0&&unit.lane<=2&&!unit.ownerId&&!unit.dominatedBy;

export function canDenyTarget(source,target,owner=source){
 if(!source||!alive(target)||source.team!==target.team||owner?.kind!=='hero'||owner.team!==source.team)return false;
 if(target.kind==='tower')return target.hp<target.maxHp*.1;
 return isLaneCreep(target)&&target.hp<target.maxHp*.5;
}
