import * as Skills from './hero-runtime.js';
import * as Inventory from './inventory.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const active=(g,s)=>s.startedAt<=g.time+1e-7&&s.until>g.time+1e-7;

export function spellProtection(g,target){
  const statuses=Object.values(target.statuses||{}).filter(s=>active(g,s));
  return {
    reflect:Skills.hasStatusFlag(g,target,'spellReflect'),
    block:statuses.some(s=>s.spellBlock)||Inventory.itemEntries(target,['inventory','neutral']).some(e=>
      e.id==='sphere'&&e.meta.ownerId===target.id&&(e.meta.readyAt||0)<=g.time&&(e.meta.cooldownRemaining||0)<=0)
  };
}

export function basicDispelNeeded(g,h){
  return Object.values(h.statuses||{}).some(s=>active(g,s)&&!s.positive&&!s.undispellable&&!s.strongDispelOnly&&
    !s.stunned&&!['stun','taunt'].includes(s.id)&&
    (s.silenced||s.silence||s.rooted||s.id==='root'||s.disarmed||s.disarm||s.slowPct>=25||s.tickDamage>0));
}

export function channelOf(g,target){
  const channel=target.channel||target.freezingField||target.itemChannel;
  return channel?.until>g.time?channel:null;
}

// Observe positions that this bot can currently see. Never infer velocity from
// an enemy's orders, destination or a position updated while hidden.
export function observeMotion(g,h,enemies){
  const previous=h.botState.observedMotion||{},next={};
  for(const enemy of enemies){
    const last=previous[enemy.id],dt=last?g.time-last.at:0,speed=g.combatStats(enemy).speed;
    let vx=last?.vx||0,vy=last?.vy||0;
    if(dt>1e-4){vx=(enemy.x-last.x)/dt;vy=(enemy.y-last.y)/dt;const n=Math.hypot(vx,vy);if(n>speed){vx*=speed/n;vy*=speed/n;}}
    next[enemy.id]={x:enemy.x,y:enemy.y,at:g.time,vx,vy};
  }
  h.botState.observedMotion=next;
}

export function incomingControl(g,h,ctx,horizon=1){
  const visible=new Map(ctx.enemyHeroes.map(e=>[e.id,e]));
  const disables=new Set(['chaos_knight_chaos_bolt','windrunner_shackleshot','ogre_magi_fireblast','ogre_magi_unrefined_fireblast','crystal_maiden_frostbite']);
  for(const enemy of visible.values()){
    const phase=enemy.castPhase;
    if(phase?.targetId===h.id&&disables.has(phase.skill.id)&&phase.executeAt-g.time<=horizon)return true;
    const field=enemy.channel?.kind==='freezing'?enemy.channel:enemy.freezingField;
    if(field&&distance(h,enemy)<=field.skill.values.radius+h.radius)return true;
  }
  for(const spell of g.pendingSpells){
    if(!visible.has(spell.sourceId)||spell.cancelled)continue;
    const eta=Number.isFinite(spell.landAt)?spell.landAt-g.time:spell.speed?distance(spell,h)/spell.speed:Infinity;
    if(eta<-.03||eta>horizon)continue;
    if(['chaos:bolt','shackle','ogre:fireblast'].includes(spell.type)&&spell.targetId===h.id)return true;
    // Torrent's warning and Ghostship's path are public after release. Cast
    // phase point orders are deliberately excluded from this observation.
    if(['torrent','ship'].includes(spell.type)&&distance(spell,h)<(spell.type==='torrent'?spell.skill.values.radius:spell.skill.values.ghostship_width)+h.radius)return true;
  }
  return false;
}
