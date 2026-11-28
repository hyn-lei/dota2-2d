import {isControlledCreature} from './controlled-units.js';

export const DENIED_LANE_XP_RADIUS=1524;
const alive=unit=>unit&&!unit.dead&&unit.hp>0;

export const isLaneCreep=unit=>unit?.kind==='creep'&&[0,1].includes(unit.team)&&
 Number.isInteger(unit.lane)&&unit.lane>=0&&unit.lane<=2&&!unit.ownerId&&!unit.dominatedBy;

export const isDeniableControlledCreature=unit=>isControlledCreature(unit)&&!unit.crystalClone&&!unit.isTormentor&&!unit.isRoshan;
export const isPlacedWard=(unit,time=-Infinity)=>unit?.kind==='ward'&&['observer','sentry'].includes(unit.wardType)&&
 (unit.expiresAt??Infinity)>time;

export function canDenyTarget(source,target,owner=source,wardBlocksCamp=false,laneAttackReleased=false){
 if(!source||!alive(target)||source===target||source.team!==target.team||owner?.kind!=='hero'||owner.team!==source.team)return false;
 if(target.kind==='tower'||target.kind==='barracks'||target.kind==='filler')return target.hp<target.maxHp*.1;
 if(isPlacedWard(target))return wardBlocksCamp;
 if(isLaneCreep(target))return laneAttackReleased||target.hp<=target.maxHp*.5;
 return isDeniableControlledCreature(target)&&target.hp<target.maxHp*.5;
}
