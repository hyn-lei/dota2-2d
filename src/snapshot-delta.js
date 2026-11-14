export const SNAPSHOT_PROTOCOL='delta-v1';
export const SNAPSHOT_WINDOW=4;
const none=new Set(),entityField=new Set(['entities']);

function equal(a,b){
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));
}
function fields(previous,current,skip=none){
 const values={},remove=[];
 for(const key of Object.keys(current))if(!skip.has(key)&&!equal(previous?.[key],current[key])){
  if(current[key]===undefined)remove.push(key);else values[key]=current[key];
 }
 for(const key of Object.keys(previous||{}))if(!skip.has(key)&&!Object.hasOwn(current,key))remove.push(key);
 return {values,remove};
}
export function snapshotDelta(previous,current){
 const root=fields(previous,current,entityField),before=new Map(previous.entities.map(e=>[e.id,e])),entities=[];
 for(const entity of current.entities){const patch=fields(before.get(entity.id),entity);if(Object.keys(patch.values).length||patch.remove.length)entities.push({id:entity.id,...patch});before.delete(entity.id);}
 const order=current.entities.map(e=>e.id),oldOrder=previous.entities.map(e=>e.id);
 return {...root,entities,removed:[...before.keys()],...(!equal(order,oldOrder)?{order}:{})};
}
export function applySnapshotDelta(previous,delta){
 if(!previous)throw Error('A full snapshot is required before a delta');
 const result={...previous,...delta.values};for(const key of delta.remove)delete result[key];
 const entities=new Map(previous.entities.map(e=>[e.id,e]));
 for(const id of delta.removed)entities.delete(id);
 for(const patch of delta.entities){const entity={...entities.get(patch.id),...patch.values};for(const key of patch.remove)delete entity[key];if(entity.id!==patch.id)throw Error('Invalid snapshot entity');entities.set(patch.id,entity);}
 result.entities=delta.order?delta.order.map(id=>{const entity=entities.get(id);if(!entity)throw Error('Invalid snapshot order');return entity;}):[...entities.values()];
 return result;
}
