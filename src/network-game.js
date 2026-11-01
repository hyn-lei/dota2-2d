import { Game } from './engine.js';

// Queries use the latest server snapshot. Every mutation waits for a server ACK.
export class NetworkGame extends Game {
  constructor({state,playerId,request}){
    super({hero:state.entities.find(e=>e.id===playerId)?.heroId,difficulty:'nightmare'});
    this.isNetwork=true;this.playerId=playerId;this.request=request;this.applySnapshot(state);
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
