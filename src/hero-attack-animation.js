import {ATTACK_PROFILES} from './attack-records.js';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=n=>n*n*(3-2*n);
const alive=h=>h&&!h.dead&&h.hp>0&&['hero','illusion'].includes(h.kind);
const visuals=new Set(['meleeSlash','bladeSlash','axeSlash','tideSlash','ogreSmash','chaosSlash','weaverAttack','weaverGeminate','frostAttack','arrowAttack','drowArrow','drowFrostArrow','radiantBolt','direBolt']);

export class HeroAttackAnimations{
 constructor(){this.releases=new Map();this.owner=null;this.sampleAt=0;this.authorityAt=0;}
 update(game,owner=game){
  const reset=owner!==this.owner||owner.time<this.authorityAt||owner.time-this.authorityAt>1;
  if(reset)this.releases.clear();
  // A delayed newer packet can lower presentation time after extrapolation.
  // Keep animations monotonic until the authoritative match clock really resets.
  this.sampleAt=reset?game.time:Math.max(this.sampleAt,game.time);
  this.owner=owner;this.authorityAt=owner.time;
  const live=new Set(game.entities.filter(alive).map(h=>h.id));
  for(const effect of game.effects||[]){
   if(!live.has(effect.sourceId)||!visuals.has(effect.visual)||!['slash','projectile'].includes(effect.type))continue;
   const at=Number.isFinite(effect.startedAt)?effect.startedAt:owner.time-Math.max(0,(effect.maxLife||.24)-effect.life),age=this.sampleAt-at;
   if(age<0||age>.35)continue;
   const old=this.releases.get(effect.sourceId);
   if(!old||at>=old.at&&effect.id!==old.id)this.releases.set(effect.sourceId,{id:effect.id,at});
  }
  // Infer a missing short projectile release from the authoritative snapshot,
  // once. Presentation time keeps advancing while raw attackFlash is frozen.
  for(const hero of game.entities){
   if(!live.has(hero.id)||hero.attackPhase||hero.attackCooldown<=0||hero.attackFlash<=0||hero.attackFlash>.24)continue;
   const at=owner.time-(.24-hero.attackFlash),age=this.sampleAt-at,old=this.releases.get(hero.id);
   if(age>=0&&age<=.35&&(!old||at>old.at+.001))this.releases.set(hero.id,{id:null,at});
  }
  for(const [id,release]of this.releases)if(!live.has(id)||this.sampleAt-release.at>.35||this.sampleAt<release.at)this.releases.delete(id);
 }
 pose(hero,time){
  if(!alive(hero))return null;
  time=Math.max(time,this.sampleAt);
  const ranged=(ATTACK_PROFILES[hero.heroId]?.speed??(hero.range>200?1:0))>0,phase=hero.attackPhase,
   release=this.releases.get(hero.id),duration=clamp(.32*100/Math.max(60,hero.attackSpeed||100),.12,.24),age=release?time-release.at:Infinity;
  // Geminate can really fire while the next primary attack is winding up.
  // The newer release takes precedence; an older release never hides a new windup.
  if(phase&&(!release||release.at<=phase.startedAt||age>=duration)){
   const progress=clamp((time-phase.startedAt)/Math.max(.001,phase.executeAt-phase.startedAt)),power=smooth(progress);
   return {phase:'windup',x:(ranged?2.5:3)*power,rotation:(ranged?.055:.10)*power,scaleX:1,scaleY:1,
    weaponRotation:(hero.heroId==='chaos_knight'||hero.heroId==='ogre_magi'?-.25:.25)*power};
  }
  if(age<0||age>=duration)return null;
  const progress=clamp(age/duration),power=Math.sin(progress*Math.PI),weaver=hero.heroId==='weaver';
  return {phase:progress<.45?'strike':'recover',x:(weaver?-5.5:ranged?3.5:-5)*power,
   rotation:(weaver?-.075:ranged?.07:-.15)*power,scaleX:1,scaleY:weaver?1-.055*power:1,
   weaponRotation:(hero.heroId==='chaos_knight'||hero.heroId==='ogre_magi'?.75:-.75)*power};
 }
}
