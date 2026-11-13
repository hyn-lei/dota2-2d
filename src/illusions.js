import {ITEM_BY_ID} from './item-data.js';
import {createMeta,ensureInventory} from './inventory.js';
export const weakIllusion=unit=>unit?.kind==='illusion'&&unit.illusionType!=='strong';
export const strongIllusion=unit=>unit?.kind==='illusion'&&unit.illusionType==='strong';
export const ownsIllusion=(owner,unit)=>unit?.kind==='illusion'&&unit.ownerId===owner?.id&&unit.team===owner.team;
export const WEAK_ILLUSION_TARGET_RADIUS=600;
const skipped=new Set(['id','kind','x','y','isPlayer','isHuman','clientId','playerName','controller','courierId','ownerId','destination','explicitTarget','targetId','pickupTargetId','movementInput','attackPhase','castPhase','channel','itemChannel','forcedMotion','cloneHop','omnislash','freezingField','xMark','lastDamagers','dead','deathTime','respawnTimer','reincarnating','navIndex','navRetryAt']);

function snapshotStatuses(g,source,strong){
 // Buff values and their original expiry belong to the new unit. Casting and
 // channel orders are not buffs, and later owner changes never update copies.
 const entries=Object.entries(source.statuses||{}).filter(([id,s])=>!['casting','channel'].includes(id)&&
  (strong||s.positive&&s.startedAt<=g.time&&s.until>g.time));
 return structuredClone(Object.fromEntries(entries));
}

export function createIllusions(g,source,count,duration,outgoing=100,incoming=100,{type='weak'}={}){
 const strong=type==='strong',results=[],ownerId=source.kind==='illusion'?source.ownerId:source.id;
 for(let i=0;i<count;i++){
  const copied={};for(const [key,value]of Object.entries(source))if(!skipped.has(key)&&!/(?:cache|^nav|^bot)/i.test(key)){try{copied[key]=structuredClone(value);}catch{}}
  const clone=g._unit('illusion',source.team,source.x+(i%2?50:-50),source.y+35+Math.floor(i/2)*50,{...copied,heroId:source.heroId,name:source.name.replace(/幻象$/,'')+'幻象',ownerId,illusionType:strong?'strong':'weak',controller:'manual',isPlayer:false,isHuman:false,expiresAt:g.time+duration,illusionOutgoing:strong?1:outgoing/100,illusionIncoming:strong?1:incoming/100,attackType:'hero',movementInput:{x:0,y:0},targetId:null,explicitTarget:null,destination:null,attackPhase:null,castPhase:null,attackCooldown:0,skillPoints:0,talentPoints:0,statuses:snapshotStatuses(g,source,strong),buffs:strong?structuredClone(source.buffs||{}):{},itemAura:{},itemSerial:0,navPath:null});
  ensureInventory(clone);
  for(const area of ['inventory','backpack','stash','tp'])clone[area+'Meta']=clone[area].map((id,index)=>{
   if(!id)return null;const original=source[area+'Meta']?.[index]||{},meta={...structuredClone(original),...createMeta(clone,id),mode:original.mode,charges:original.charges??ITEM_BY_ID[id].charges,ownerId:clone.id};
   if(strong)Object.assign(meta,structuredClone(original),{uid:meta.uid,ownerId:clone.id});
   else if(id==='armlet'){meta.mode='off';meta.armletStrength=0;}
   if(original.ownerId&&original.ownerId!==source.id&&!original.freeRapier)meta.ownerId=original.ownerId;
   meta.illusionCopy=true;return meta;
  });
  clone.cooldowns=[...(source.cooldowns||[0,0,0,0])];clone.extraCooldowns=strong?{...source.extraCooldowns}:{};clone.itemCooldowns=strong?{...source.itemCooldowns}:{};
  if(!strong){clone.autocast={...source.autocast};if(source.heroId==='ogre_magi')clone.autocast[2]=false;if(source.heroId==='drow_ranger')clone.autocast[0]=false;clone.armletHealthBonus=undefined;}
  g._refreshHero(clone);clone.hp=Math.min(clone.maxHp,strong?source.hp:clone.maxHp*source.hp/source.maxHp);clone.mana=strong?Math.min(clone.maxMana,source.mana):0;if(!strong)clone.maxMana=0;
  clone.radianceBurn=clone.inventory.some((id,index)=>id==='radiance'&&clone.inventoryMeta[index]?.mode!=='off');
  g.entities.push(clone);results.push(clone);
 }
 return results;
}
