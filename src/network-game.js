import { Game } from './engine.js';

// Queries use the latest server snapshot. Every mutation waits for a server ACK.
export class NetworkGame extends Game {
  constructor({state,playerId,request}){
    super({hero:state.entities.find(e=>e.id===playerId)?.heroId,difficulty:'nightmare'});
    this.isNetwork=true;this.playerId=playerId;this.selectedId=playerId;this.request=request;this.applySnapshot(state);
  }
  get player(){return this.entities.find(e=>e.id===this.playerId)||super.player;}
  applySnapshot(state){
    const selected=this.selectedId;
    Object.assign(this,state);
    this.entities=state.entities.map(e=>({...e,isPlayer:e.id===this.playerId}));
    this.cutTrees=new Map(state.cutTrees||[]);
    this.selectedId=this.entities.some(e=>e.id===selected)?selected:this.playerId;
    this._index();
  }
  step(){} // The server is the only simulation clock.
  setPaused(){} // A personal menu cannot pause the other four players.
  guard(area,index){return {area,index,uid:this.player[area+'Meta']?.[index]?.uid||null};}
  point(p){return p?{x:p.x,y:p.y,...(p.id===this.player.id?{self:true}:{}),...(p.direction?{direction:{x:p.direction.x,y:p.direction.y}}:{})}:null;}
  invoke(action,args=[],slotGuards=[]){return this.request(action,args,slotGuards);}
  unitCommand(id,action,args=[]){
    const unit=this.entities.find(e=>e.id===id);if(!unit||!this.canControl(unit)||unit.kind!=='illusion')return Promise.resolve({ok:false,reason:'只能操控自己制造的幻象'});
    if(action==='setMovement'){
      this.unitMovements||=new Map();const now=performance.now(),previous=this.unitMovements.get(id);
      if(previous&&previous.x===args[0]&&previous.y===args[1]&&(!args[0]&&!args[1]||now-previous.at<250))return;
      this.unitMovements.set(id,{x:args[0],y:args[1],at:now});
    }
    const values=[...args];if(['cast','castExtra','useItem'].includes(action))values[1]=values[1]?{x:values[1].x,y:values[1].y,...(values[1].id===id||values[1].self?{self:true}:{})}:null;
    const slots=action==='useItem'?[[values[2]||'inventory',values[0]]]:action==='recall'?[['tp',0]]:[];
    return this.invoke('unitCommand',[id,action,values],slots.map(([area,index])=>({area,index,uid:unit[area+'Meta']?.[index]?.uid||null})));
  }
  selectEntity(id){
    const previous=this.controlledUnit;if(previous&&previous.id!==id&&previous.movementInput&&(previous.movementInput.x||previous.movementInput.y)){
      if(previous.kind==='illusion')this.unitCommand(previous.id,'setMovement',[0,0]);else this.setMovement(0,0);
    }
    super.selectEntity(id);
  }
  setMovement(x,y){
    const now=performance.now();
    if(this.lastMovement?.x===x&&this.lastMovement?.y===y&&(!x&&!y||now-this.lastMovementAt<250))return;
    this.lastMovement={x,y};this.lastMovementAt=now;return this.invoke('setMovement',[x,y]);
  }
  moveTo(x,y){return this.invoke('moveTo',[x,y]);}
  attackTarget(id){return this.invoke('attackTarget',[id]);}
  cast(index,point){return this.invoke('cast',[index,this.point(point)]);}
  castExtra(id,point){return this.invoke('castExtra',[id,this.point(point)]);}
  toggleAutocast(index){return this.invoke('toggleAutocast',[index]);}
  learnAbility(index){return this.invoke('learnAbility',[index]);}
  learnTalent(index){return this.invoke('learnTalent',[index]);}
  learnAttributes(){return this.invoke('learnAttributes');}
  recall(){return this.invoke('recall',[],[this.guard('tp',0)]);}
  useItem(index,point,area='inventory'){return this.invoke('useItem',[index,this.point(point),area],[this.guard(area,index)]);}
  buy(id){return this.invoke('buy',[id]);}
  moveItem(from,index,to,targetIndex){return this.invoke('moveItem',[from,index,to,targetIndex],[this.guard(from,index),this.guard(to,targetIndex)]);}
  sellItem(area,index){return this.invoke('sellItem',[area,index],[this.guard(area,index)]);}
  collectStash(){return this.invoke('collectStash');}
  queueItem(id,append=false){return this.invoke('queueItem',[id,append]);}
  clearQuickbuy(){return this.invoke('clearQuickbuy');}
  buyQuick(){return this.invoke('buyQuick');}
  setCombineLock(area,index,locked){return this.invoke('setCombineLock',[area,index,locked??!this.player[area+'Meta']?.[index]?.combineLocked],[this.guard(area,index)]);}
  disassembleItem(area,index){return this.invoke('disassembleItem',[area,index],[this.guard(area,index)]);}
  dropItem(area,index,point){return this.invoke('dropItem',[area,index,this.point(point)],[this.guard(area,index)]);}
  pickupItem(id){return this.invoke('pickupItem',[id]);}
  pickupOrApproach(id){return this.pickupItem(id);}
  courierCommand(command){return this.invoke('courierCommand',[command]);}
  buyWithCourier(id){return this.invoke('buyWithCourier',[id]);}
}
