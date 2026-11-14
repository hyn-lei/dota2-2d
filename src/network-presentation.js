import {CollisionWorld} from './collision.js';
import {TREES} from './map-data.js';

const structures=new Set(['tower','barracks','ancient','fountain','filler','glacierWall']);
const interruptions=new Set(['attackTarget','cast','castExtra','useItem','recall','pickupItem','stop']);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleBetween=(a,b,t)=>(a||0)+Math.atan2(Math.sin((b||0)-(a||0)),Math.cos((b||0)-(a||0)))*t;

// Presentation owns only poses and movement intents. Simulation, inventory,
// damage and command success always come from the authoritative snapshot.
export class NetworkPresentation {
  constructor(game){
    this.game=game;this.samples=[];this.commands=[];this.predictors=new Map();
    this.shown=new Map();this.cutoffs=new Map();this.interval=.1;this.suspended=false;
    this.world=Object.create(game);this.world.collisions=new CollisionWorld();
  }
  accept(metadata,now){
    const game=this.game,former=this.samples.at(-1),entities=new Map(game.entities.map(e=>[e.id,e]));
    this.enabled=Number.isSafeInteger(metadata.commandId)&&metadata.commandId>=0;
    if(Number.isFinite(metadata.rttMs))game.networkRtt=metadata.rttMs;
    const reset=this.suspended||game.paused||game.status!=='playing'||!former||game.time<former.time;
    this.suspended=false;
    if(reset){this.samples=[];this.shown.clear();this.cutoffs.clear();this.renderTime=game.time;}
    else if(game.time>former.time)this.interval=clamp(this.interval*.8+(game.time-former.time)*.2,.08,.2);
    for(const entity of entities.values()){
      const before=former?.entities.get(entity.id),elapsed=game.time-(former?.time??game.time);
      if(!before||before.dead!==entity.dead||distance(before,entity)>Math.max(120,(entity.speed||300)*elapsed*1.8))this.cutoffs.set(entity.id,game.time);
    }
    for(const id of this.cutoffs.keys())if(!entities.has(id))this.cutoffs.delete(id);
    this.samples.push({time:game.time,at:now,entities});if(this.samples.length>6)this.samples.shift();
    this.commands=this.enabled&&!game.paused&&game.status==='playing'?this.commands.filter(c=>c.id>metadata.commandId&&entities.has(c.actorId)):[];
    this.syncNavigation();this.rebase(now,reset);
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
    this.commands.push({id,actorId,action,args:[...args],at:now});if(this.commands.length>64)this.commands.shift();
    this.rebase(now);
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
    this.predictors=new Map();this.baseAt=latest.at-clamp((this.game.networkRtt||0)/2,0,250);
    if(this.enabled&&!this.suspended)for(const id of ids){
      const authoritative=latest.entities.get(id);if(!authoritative||!this.game.canControl(authoritative))continue;
      const unit={...authoritative,movementInput:{...authoritative.movementInput},navPath:null,navGoal:null};
      this.predictors.set(id,{unit,at:this.baseAt,applied:new Set(),hold:false,offset:{x:0,y:0},correctedAt:now,correctionMs:80});
    }
    this.world.time=this.game.time;
    this.world.entities=this.game.entities.map(e=>this.predictors.get(e.id)?.unit||e);
    this.world.collisions.rebuild(this.world.entities,this.game.time);
    this.advance(now);
    for(const [id,predictor]of this.predictors){
      const before=this.shown.get(id),latestBreak=this.cutoffs.get(id)===latest.time,canSmooth=before&&!snap&&!latestBreak&&!this.blocked(predictor.unit)&&distance(before,predictor.unit)<160;
      if(canSmooth){
        predictor.offset={x:before.x-predictor.unit.x,y:before.y-predictor.unit.y};
        const speed=this.world.combatStats(predictor.unit).speed;
        // A delayed direction confirmation must not pull a walking pose backwards.
        // Limit the initial correction speed to half of the current walking speed.
        if(predictor.unit.moving&&speed>0)predictor.correctionMs=Math.max(80,Math.hypot(predictor.offset.x,predictor.offset.y)*2000/speed);
      }
    }
  }
  applyIntent(predictor,command){
    const unit=predictor.unit,{action,args}=command;
    if(action==='setMovement'){
      const length=Math.hypot(args[0],args[1]);unit.movementInput=length?{x:args[0]/length,y:args[1]/length}:{x:0,y:0};
      if(length){unit.explicitTarget=null;unit.targetId=null;predictor.hold=false;}
    }else if(action==='moveTo'){
      unit.destination=this.game.navigation.nearestWalkable({x:args[0],y:args[1]});unit.explicitTarget=null;unit.targetId=null;predictor.hold=false;
    }else predictor.hold=true;
    unit.navPath=null;unit.navGoal=null;
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
  advance(now){
    const latest=this.samples.at(-1);if(!latest)return;
    // Missing snapshots cannot cause unlimited movement during a stalled link.
    const to=Math.min(now,latest.at+250);for(const predictor of this.predictors.values())this.advanceUnit(predictor,to);
  }
  remotePose(entity,time){
    if(structures.has(entity.kind))return entity;
    const samples=this.samples.filter(s=>s.time>=(this.cutoffs.get(entity.id)??-Infinity)&&s.entities.has(entity.id));
    if(samples.length<2)return entity;
    let before=samples[0],after=samples.at(-1);
    for(const sample of samples){if(sample.time<=time)before=sample;else{after=sample;break;}}
    const a=before.entities.get(entity.id),b=after.entities.get(entity.id),span=after.time-before.time;
    const t=span>0?clamp((time-before.time)/span,0,1):1;
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:angleBetween(a.angle,b.angle,t),moving:entity.moving};
  }
  view(now){
    const game=this.game,latest=this.samples.at(-1);if(!latest||this.suspended||game.paused||game.status!=='playing')return game;
    this.advance(now);
    this.renderTime=Math.max(this.renderTime??-Infinity,Math.min(latest.time,latest.time+(now-latest.at)/1000-this.interval));
    const view=Object.create(game);view.time=latest.time+clamp((now-latest.at)/1000,0,.2);view.renderView=()=>view;
    view.entities=game.entities.map(entity=>{
      const predictor=this.predictors.get(entity.id);let pose;
      if(predictor&&this.blocked(entity))pose=entity;
      else if(predictor){
        const decay=Math.exp(-(now-predictor.correctedAt)/predictor.correctionMs),unit=predictor.unit;
        pose={x:unit.x+predictor.offset.x*decay,y:unit.y+predictor.offset.y*decay,angle:unit.angle,moving:unit.moving};
      }else pose=this.remotePose(entity,this.renderTime);
      this.shown.set(entity.id,pose);return pose===entity?entity:{...entity,...pose};
    });
    for(const id of this.shown.keys())if(!latest.entities.has(id))this.shown.delete(id);
    return view;
  }
  suspend(){this.suspended=true;this.commands=[];this.predictors.clear();this.shown.clear();}
}
