// Visual-only profiles. Speeds shape animation; ordinary attacks still settle on release.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function effectIsActive(effect,game){
  if(effect.visual==='shackleShot'&&game.pendingSpells){
    return game.pendingSpells.some(s=>s.type==='shackle'&&s.sourceId===effect.sourceId&&s.targetId===effect.targetId);
  }
  if(effect.visual==='shackleLink'){
    const target=game.entities.find(e=>e.id===effect.targetId&&!e.dead);
    const anchor=effect.anchorId&&game.entities.find(e=>e.id===effect.anchorId&&!e.dead);
    return !!(target&&effect.targetStun&&target.statuses?.stun===effect.targetStun&&effect.targetStun.until>game.time&&
      (!effect.anchorId||anchor&&effect.anchorStun&&anchor.statuses?.stun===effect.anchorStun&&effect.anchorStun.until>game.time));
  }
  return true;
}
export function attackVisualFields(source,target){
  const ranged=source.range>200;
  let visual='meleeSlash',color='#ead9b2',speed=900;
  if(source.kind==='tower'||source.kind==='fountain'){
    visual=source.team?'direTower':'radiantTower';color=source.team?'#ff713b':'#ffd77c';speed=1200;
  }else if(source.heroId==='crystal_maiden'){visual='frostAttack';color='#9ae8ff';}
  else if(source.heroId==='windranger'){visual='arrowAttack';color='#bddd8a';speed=1250;}
  else if(source.heroId==='juggernaut'){visual='bladeSlash';color='#ffb36b';}
  else if(source.heroId==='axe'){visual='axeSlash';color='#ef6548';}
  else if(source.heroId==='kunkka'){visual='tideSlash';color='#81dfec';}
  else if(ranged){visual=source.kind==='neutral'?'neutralBolt':source.team?'direBolt':'radiantBolt';color=source.kind==='neutral'?'#cdb1ff':source.team?'#ff8055':'#c9eb91';}
  return {visual,color,sourceId:source.id,targetId:target.id,heroId:source.heroId,sourceKind:source.kind,
    team:source.team,tx:target.x,ty:target.y,angle:Math.atan2(target.y-source.y,target.x-source.x),
    radius:ranged?12:65,life:ranged?clamp(Math.hypot(target.x-source.x,target.y-source.y)/speed,.12,.8):.24,
    lift:source.kind==='tower'?135:source.kind==='hero'?42:24,targetLift:target.kind==='hero'?35:20};
}

export function effectPose(effect,time,entities=[]){
  const duration=effect.maxLife||.5;
  const progress=clamp(effect.startedAt==null?1-effect.life/duration:(time-effect.startedAt)/duration,0,1);
  const target=effect.visual==='shackleShot'&&entities.find(e=>e.id===effect.targetId&&!e.dead);
  const tx=target?.x??effect.tx??effect.x,ty=target?.y??effect.ty??effect.y;
  const y=effect.y-(effect.lift||0),endY=ty-(effect.targetLift||0);
  return {progress,x:effect.x+(tx-effect.x)*progress,y:y+(endY-y)*progress,
    angle:Math.atan2(endY-y,tx-effect.x),distance:Math.hypot(tx-effect.x,endY-y),tx,ty:endY};
}

export function unitVisuals(unit,time){
  if(unit.dead)return [];
  const live=id=>unit.statuses?.[id]?.until>time;
  const result=[];
  if(live('spin'))result.push('bladeFury');
  if(live('frostbite'))result.push('frostbite');
  if(live('windrun'))result.push('windrun');
  if(live('focus'))result.push('focus');
  if(live('call'))result.push('call');
  if(Object.values(unit.statuses||{}).some(s=>s.hunger&&s.until>time))result.push('hunger');
  if(unit.channel?.kind==='freezing'&&unit.channel.until>time||unit.freezingField?.until>time)result.push('freezingField');
  if(unit.channel?.kind==='powershot'&&unit.channel.until>time)result.push('powershotCharge');
  if(unit.crystalClone&&unit.expiresAt>time)result.push('crystalClone');
  if(unit.kind==='ward'&&unit.healRadius)result.push('healingWard');
  return result;
}
