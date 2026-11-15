import {CollisionWorld} from './collision.js';
import {TREES,WORLD} from './map-data.js';

const structures=new Set(['tower','barracks','ancient','fountain','filler','glacierWall']);
const interruptions=new Set(['attackTarget','cast','castExtra','useItem','recall','pickupItem','stop']);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleBetween=(a,b,t)=>(a||0)+Math.atan2(Math.sin((b||0)-(a||0)),Math.cos((b||0)-(a||0)))*t;
const MAX_PREDICTION_MS=1000,MAX_TRANSIT_MS=500,MAX_REMOTE_SECONDS=.6;

// Presentation owns only poses and movement intents. Simulation, inventory,
// damage and command success always come from the authoritative snapshot.
export class NetworkPresentation {
  constructor(game){
    this.game=game;this.samples=[];this.commands=[];this.predictors=new Map();
    this.shown=new Map();this.cutoffs=new Map();this.remoteCorrections=new Map();this.interval=.1;this.arrivalGaps=[];this.suspended=false;
    this.world=Object.create(game);this.world.collisions=new CollisionWorld();this.displayCollisions=new CollisionWorld();
  }
  accept(metadata,now){
    const game=this.game,former=this.samples.at(-1),entities=new Map(game.entities.map(e=>[e.id,e]));
    this.enabled=Number.isSafeInteger(metadata.commandId)&&metadata.commandId>=0;
    if(Number.isFinite(metadata.rttMs))game.networkRtt=metadata.rttMs;
    const reset=this.suspended||game.paused||game.status!=='playing'||!former||game.time<former.time;
    this.suspended=false;
    this.inputUntil=0;
    if(reset){this.samples=[];this.arrivalGaps=[];this.shown.clear();this.cutoffs.clear();this.renderTime=game.time;}
    else{
      this.arrivalGaps.push(clamp(now-former.at,0,MAX_PREDICTION_MS));if(this.arrivalGaps.length>20)this.arrivalGaps.shift();
      if(game.time>former.time)this.interval=clamp(this.interval*.8+(game.time-former.time)*.2,.08,.2);
    }
    for(const entity of entities.values()){
      const before=former?.entities.get(entity.id),elapsed=game.time-(former?.time??game.time);
      if(!before||before.dead!==entity.dead||distance(before,entity)>Math.max(120,(entity.speed||300)*elapsed*1.8))this.cutoffs.set(entity.id,game.time);
    }
    for(const id of this.cutoffs.keys())if(!entities.has(id))this.cutoffs.delete(id);
    this.samples.push({time:game.time,at:now,entities});if(this.samples.length>6)this.samples.shift();
    this.commands=this.enabled&&!game.paused&&game.status==='playing'?this.commands.filter(c=>c.id>metadata.commandId&&entities.has(c.actorId)):[];
    this.syncNavigation();this.rebase(now,reset);this.reconcileRemotes(now,reset);
  }
  syncNavigation(){
    const game=this.game,buildings=game.entities.filter(e=>structures.has(e.kind)),trees=(game.plantedTrees||[]).filter(t=>t.until>game.time);
    const key=JSON.stringify([[...game.cutTrees.keys()],trees.map(t=>[t.x,t.y]),buildings.filter(e=>!e.dead).map(e=>e.id)]);
    if(key===this.navigationKey)return;this.navigationKey=key;
    game.navigation.updateTrees([...TREES.filter((_,i)=>!game.cutTrees.has(i)),...trees],buildings);
  }
  command(id,action,args,now){
    if(!this.enabled||this.suspended||!Number.isSafeInteger(id))return;
    let actorId=this.game.playerId;
    if(action==='unitCommand'){[actorId,action,args]=args;}
    if(!['setMovement','moveTo',...interruptions].includes(action))return;
    const unit=this.game.entities.find(e=>e.id===actorId);
    if(!unit||!this.game.canControl(unit))return;
    const shownAt=Math.min(now,this.predictionDeadline());this.advance(now);
    const command={id,actorId,action,args:[...args],at:now};
    this.commands.push(command);if(this.commands.length>64)this.commands.shift();
    const latest=this.samples.at(-1);if(!latest)return;
    if(now>latest.at+MAX_PREDICTION_MS)return;
    this.inputUntil=Math.min(latest.at+MAX_PREDICTION_MS,Math.max(this.inputUntil||0,now+this.predictionWindow()));
    const predictor=this.predictors.get(actorId);
    if(!predictor)this.rebase(now);
    else{
      // Apply fresh input to the current pose. Replaying a stale prefix here
      // would catch up invisible movement before responding to a stop or turn.
      // Absorb the current displayed correction before every fresh intent.
      // An old idle correction must not overpower a newly chosen direction.
      const decay=Math.exp(-(shownAt-predictor.correctedAt)/predictor.correctionMs);
      const corrected={x:predictor.unit.x+predictor.offset.x*decay,y:predictor.unit.y+predictor.offset.y*decay};
      if(this.safeCorrection(predictor.unit,corrected)){predictor.unit.x=corrected.x;predictor.unit.y=corrected.y;}
      predictor.offset={x:0,y:0};this.world.collisions.update(predictor.unit);
      predictor.at=Math.max(predictor.at,now);this.applyIntent(predictor,command);predictor.applied.add(id);
    }
  }
  reject(id,now){
    if(!this.commands.some(c=>c.id===id))return;
    this.commands=this.commands.filter(c=>c.id!==id);this.rebase(now,true);
  }
  blocked(unit){
    const game=this.game;
    return this.suspended||game.paused||game.status!=='playing'||unit.dead||unit.hp<=0||game.isStunned(unit)||game.isRooted(unit)||
      !!game._tauntSource(unit)||!!unit.itemChannel||!!unit.forcedMotion||!!unit.castPhase||!!unit.omnislash||!!unit.cloneHop||
      unit.recallTimer>0||!!unit.neutralCast||!!unit.neutralChannel||!!unit.channel&&unit.channel.kind!=='multishot';
  }
  rebase(now,snap=false){
    const latest=this.samples.at(-1);if(!latest)return;
    const prior=this.predictors,ids=new Set([this.game.playerId,...prior.keys(),...this.commands.map(c=>c.actorId)]);
    this.predictors=new Map();this.baseAt=latest.at-clamp((this.game.networkRtt||0)/2,0,MAX_TRANSIT_MS);
    if(this.enabled&&!this.suspended)for(const id of ids){
      const authoritative=latest.entities.get(id);if(!authoritative||!this.game.canControl(authoritative))continue;
      const unit={...authoritative,movementInput:{...authoritative.movementInput},navPath:null,navGoal:null};
      this.predictors.set(id,{unit,at:this.baseAt,applied:new Set(),hold:false,offset:{x:0,y:0},correctedAt:Math.min(now,this.predictionDeadline()),correctionMs:80});
    }
    this.world.time=this.game.time;
    this.world.entities=this.game.entities.map(e=>this.predictors.get(e.id)?.unit||e);
    this.world.collisions.rebuild(this.world.entities,this.game.time);
    this.advance(now);
    for(const [id,predictor]of this.predictors){
      const unit=predictor.unit,before=this.shown.get(id),latestBreak=this.cutoffs.get(id)===latest.time,canSmooth=before&&!snap&&!latestBreak&&!this.blocked(unit);
      if(canSmooth){
        const speed=this.world.combatStats(unit).speed,transit=clamp((this.game.networkRtt||0)/2,0,MAX_TRANSIT_MS);
        const limit=Math.max(160,speed*(this.predictionWindow()+transit)/1000);
        if(distance(before,unit)>=limit||!this.safeCorrection(unit,before))continue;
        predictor.offset={x:before.x-unit.x,y:before.y-unit.y};
        // A delayed direction confirmation must not pull a walking pose backwards.
        // Limit the initial correction speed to half of the current walking speed.
        // Replay can end on a fresh intent before any movement step has occurred.
        const input=unit.movementInput||{},walking=unit.moving||!predictor.hold&&!unit.explicitTarget&&(input.x||input.y||unit.destination&&distance(unit,unit.destination)>3);
        if(walking&&speed>0)predictor.correctionMs=Math.max(80,Math.hypot(predictor.offset.x,predictor.offset.y)*2000/speed);
      }
    }
  }
  applyIntent(predictor,command){
    const unit=predictor.unit,{action,args}=command;
    if(action==='setMovement'){
      const length=Math.hypot(args[0],args[1]);unit.movementInput=length?{x:args[0]/length,y:args[1]/length}:{x:0,y:0};
      if(length){unit.explicitTarget=null;unit.targetId=null;predictor.hold=false;if(unit.zealot)unit.destination=null;}
    }else if(action==='moveTo'){
      unit.destination=this.game.navigation.nearestWalkable({x:args[0],y:args[1]});unit.explicitTarget=null;unit.targetId=null;predictor.hold=false;
    }else predictor.hold=true;
    unit.navPath=null;unit.navGoal=null;unit.moving=false;
  }
  advanceUnit(predictor,to){
    const unit=predictor.unit;
    const move=until=>{
      let remaining=Math.max(0,(until-predictor.at)/1000);
      while(remaining>1e-7){
        const dt=Math.min(.05,remaining);remaining-=dt;unit.moving=false;
        if(predictor.hold||this.blocked(unit)||unit.explicitTarget)continue;
        const input=unit.movementInput||{},point=input.x||input.y?{x:unit.x+(input.x||0)*100,y:unit.y+(input.y||0)*100}:unit.destination;
        if(point){this.world._move(unit,point,dt);if(unit.destination&&distance(unit,unit.destination)<3)unit.destination=null;}
      }
      predictor.at=until;
    };
    for(const command of this.commands)if(command.actorId===unit.id&&!predictor.applied.has(command.id)&&command.at<=to){
      move(Math.max(predictor.at,command.at));this.applyIntent(predictor,command);predictor.applied.add(command.id);
    }
    move(Math.max(predictor.at,to));
  }
  predictionWindow(){
    const step=this.interval*1000,rtt=clamp(this.game.networkRtt||0,0,MAX_PREDICTION_MS*2);
    return clamp(Math.max(300,rtt+step*3,Math.max(0,...this.arrivalGaps)+step),300,MAX_PREDICTION_MS);
  }
  predictionDeadline(){
    const latest=this.samples.at(-1);if(!latest)return 0;
    return Math.min(latest.at+MAX_PREDICTION_MS,Math.max(latest.at+this.predictionWindow(),this.inputUntil||0));
  }
  advance(now){
    const latest=this.samples.at(-1);if(!latest)return;
    // The latest snapshot anchors the hard limit, including repeated fresh input.
    const deadline=this.predictionDeadline(),to=Math.min(now,deadline);
    for(const predictor of this.predictors.values()){this.advanceUnit(predictor,to);if(now>deadline)predictor.unit.moving=false;}
  }
  remoteHorizon(){return Math.min(MAX_REMOTE_SECONDS,this.predictionWindow()/1000);}
  remoteTime(now){
    const latest=this.samples.at(-1);
    return Math.min(latest.time+this.remoteHorizon(),Math.max(this.renderTime??-Infinity,latest.time+(now-latest.at)/1000-this.interval));
  }
  safeCorrection(unit,point){
    if(!(point.x>=25&&point.y>=25&&point.x<=WORLD.width-25&&point.y<=WORLD.height-25))return false;
    return unit.flying||this.game.navigation.isWalkable(point)&&this.game.navigation.lineClear(unit,point)&&(unit.noCollision||!this.world.collisions.overlaps(unit,point)&&!this.world.collisions.sweep(unit,point.x-unit.x,point.y-unit.y));
  }
  projectRemote(entity,dx,dy,collisions=this.world.collisions){
    let fraction=1;const length=Math.hypot(dx,dy);
    if(!entity.flying&&!entity.noCollision){
      const hit=collisions.sweep(entity,dx,dy);if(hit)fraction=Math.max(0,hit.t-.001/Math.max(length,.001));
    }
    if(!entity.flying){
      const clear=t=>this.game.navigation.lineClear(entity,{x:entity.x+dx*t,y:entity.y+dy*t});
      if(!clear(fraction)){
        let low=0,high=fraction;for(let i=0;i<8;i++){const middle=(low+high)/2;if(clear(middle))low=middle;else high=middle;}fraction=low;
      }
    }
    return {x:clamp(entity.x+dx*fraction,25,WORLD.width-25),y:clamp(entity.y+dy*fraction,25,WORLD.height-25),blocked:fraction<1};
  }
  reconcileRemotes(now,snap){
    this.remoteCorrections.clear();this.renderTime=this.remoteTime(now);if(snap)return;
    const latest=this.samples.at(-1);
    for(const entity of latest.entities.values()){
      const before=this.shown.get(entity.id);
      if(!before||structures.has(entity.kind)||this.predictors.has(entity.id)||this.blocked(entity)||this.cutoffs.get(entity.id)===latest.time)continue;
      const pose=this.remotePose(entity,this.renderTime),error=distance(before,pose),speed=this.world.combatStats(entity).speed;
      if(error>.001&&error<Math.max(160,speed*this.remoteHorizon()*2))this.remoteCorrections.set(entity.id,{x:before.x-pose.x,y:before.y-pose.y,at:now,ms:Math.max(100,speed>0?error*2000/speed:100)});
    }
  }
  remotePose(entity,time){
    if(structures.has(entity.kind)||this.blocked(entity))return entity;
    const samples=this.samples.filter(s=>s.time>=(this.cutoffs.get(entity.id)??-Infinity)&&s.entities.has(entity.id));
    if(samples.length<2)return entity;
    const latest=samples.at(-1);
    if(time>latest.time){
      if(!entity.moving)return entity;
      const previous=samples.at(-2),a=previous.entities.get(entity.id),b=latest.entities.get(entity.id),span=latest.time-previous.time;
      if(span<=0)return entity;
      const vx=(b.x-a.x)/span,vy=(b.y-a.y)/span,speed=Math.hypot(vx,vy),maximum=this.world.combatStats(entity).speed;
      if(speed<.01||maximum<=0)return entity;
      const seconds=clamp(time-latest.time,0,this.remoteHorizon()),scale=Math.min(1,maximum/speed),pose=this.projectRemote(entity,vx*scale*seconds,vy*scale*seconds);
      return {x:pose.x,y:pose.y,angle:entity.angle,moving:!pose.blocked&&seconds<this.remoteHorizon()-1e-7};
    }
    let before=samples[0],after=samples.at(-1);
    for(const sample of samples){if(sample.time<=time)before=sample;else{after=sample;break;}}
    const a=before.entities.get(entity.id),b=after.entities.get(entity.id),span=after.time-before.time;
    const t=span>0?clamp((time-before.time)/span,0,1):1;
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:angleBetween(a.angle,b.angle,t),moving:entity.moving};
  }
  resolveRemoteFootprints(entities){
    const latest=this.samples.at(-1),remote=entity=>!this.predictors.has(entity.id)&&!structures.has(entity.kind)&&!this.blocked(entity);
    // Reserve the previous shown footprints, then advance remotes together.
    // Testing only snapshot anchors lets approaching predictions cross each other.
    const units=entities.map(entity=>{
      const before=this.shown.get(entity.id),anchor=latest.entities.get(entity.id);
      const prior=remote(entity)?before&&this.cutoffs.get(entity.id)!==latest.time&&this.safeCorrection(anchor,before)?before:anchor:entity;
      return {...entity,x:prior.x,y:prior.y};
    });
    this.displayCollisions.rebuild(units,this.game.time);
    return entities.map((entity,index)=>{
      const unit=units[index];
      if(remote(entity)){
        const pose=this.projectRemote(unit,entity.x-unit.x,entity.y-unit.y,this.displayCollisions);
        if(pose.blocked)entity={...entity,x:pose.x,y:pose.y,moving:false};
      }
      unit.x=entity.x;unit.y=entity.y;this.displayCollisions.update(unit);
      this.shown.set(entity.id,{x:entity.x,y:entity.y,angle:entity.angle,moving:entity.moving});return entity;
    });
  }
  view(now){
    const game=this.game,latest=this.samples.at(-1);if(!latest||this.suspended||game.paused||game.status!=='playing')return game;
    this.advance(now);
    this.renderTime=this.remoteTime(now);
    const view=Object.create(game);view.time=latest.time+clamp((now-latest.at)/1000,0,.2);view.renderView=()=>view;
    view.entities=game.entities.map(entity=>{
      const predictor=this.predictors.get(entity.id);let pose;
      if(predictor&&this.blocked(entity))pose=entity;
      else if(predictor){
        const decay=Math.exp(-(Math.min(now,this.predictionDeadline())-predictor.correctedAt)/predictor.correctionMs),unit=predictor.unit;
        pose={x:unit.x+predictor.offset.x*decay,y:unit.y+predictor.offset.y*decay,angle:unit.angle,moving:unit.moving};
        if((predictor.offset.x||predictor.offset.y)&&!this.safeCorrection(unit,pose)){predictor.offset={x:0,y:0};pose={...pose,x:unit.x,y:unit.y};}
      }else{
        pose=this.remotePose(entity,this.renderTime);
        const correction=this.remoteCorrections.get(entity.id);
        if(correction&&!this.blocked(entity)){
          const until=latest.at+(this.interval+this.remoteHorizon())*1000,decay=Math.exp(-(Math.min(now,until)-correction.at)/correction.ms);
          const corrected={...pose,x:pose.x+correction.x*decay,y:pose.y+correction.y*decay};
          if(this.safeCorrection(entity,corrected))pose=corrected;else this.remoteCorrections.delete(entity.id);
        }
      }
      return pose===entity?entity:{...entity,...pose};
    });
    view.entities=this.resolveRemoteFootprints(view.entities);
    for(const id of this.shown.keys())if(!latest.entities.has(id))this.shown.delete(id);
    return view;
  }
  suspend(){this.suspended=true;this.commands=[];this.predictors.clear();this.shown.clear();this.remoteCorrections.clear();}
}
