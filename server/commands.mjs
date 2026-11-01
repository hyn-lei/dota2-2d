import { WORLD, HEROES } from '../src/data.js';
import { ITEM_BY_ID } from '../src/item-data.js';
import { SLOT_COUNTS } from '../src/inventory.js';

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value, keys) => plain(value) && Object.keys(value).every(key => keys.includes(key));
const integer = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
const number = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
const id = value => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(value);
const item = value => typeof value === 'string' && Object.hasOwn(ITEM_BY_ID,value);
const slot = (area,index) => ['inventory','backpack','stash','tp'].includes(area) && integer(index,0,SLOT_COUNTS[area]-1);
const point = value => value == null || exact(value,['x','y','direction','self'])
  && number(value.x,0,WORLD.width) && number(value.y,0,WORLD.height)
  && (value.self===undefined||value.self===true)
  && (value.direction === undefined || exact(value.direction,['x','y']) && number(value.direction.x,-1,1) && number(value.direction.y,-1,1));
const args = (values, low, high=low) => Array.isArray(values) && values.length>=low && values.length<=high;
const noArgs = values => args(values,0);
const validators = {
  moveTo:a=>args(a,2)&&number(a[0],0,WORLD.width)&&number(a[1],0,WORLD.height),
  setMovement:a=>args(a,2)&&number(a[0],-1,1)&&number(a[1],-1,1),
  attackTarget:a=>args(a,1)&&id(a[0]),
  cast:a=>args(a,1,2)&&integer(a[0],0,3)&&point(a[1]),
  castExtra:a=>args(a,1,2)&&id(a[0])&&point(a[1]),
  useItem:a=>args(a,1,3)&&slot(a[2]??'inventory',a[0])&&['inventory','tp'].includes(a[2]??'inventory')&&point(a[1]),
  toggleAutocast:a=>args(a,1)&&integer(a[0],0,3),
  learnAbility:a=>args(a,1)&&integer(a[0],0,3),
  learnTalent:a=>args(a,1)&&integer(a[0],0,7),
  learnAttributes:noArgs,recall:noArgs,
  buy:a=>args(a,1)&&item(a[0]),
  moveItem:a=>args(a,4)&&slot(a[0],a[1])&&slot(a[2],a[3]),
  sellItem:a=>args(a,2)&&slot(a[0],a[1]),
  collectStash:noArgs,
  queueItem:a=>args(a,1,2)&&item(a[0])&&(a[1]===undefined||typeof a[1]==='boolean'),
  clearQuickbuy:noArgs,buyQuick:noArgs,
  setCombineLock:a=>args(a,3)&&slot(a[0],a[1])&&typeof a[2]==='boolean',
  disassembleItem:a=>args(a,2)&&slot(a[0],a[1]),
  dropItem:a=>args(a,2,3)&&slot(a[0],a[1])&&point(a[2]),
  pickupItem:a=>args(a,1)&&id(a[0]),
  courierCommand:a=>args(a,1)&&['deliver','return','secret','burst','shield','stop'].includes(a[0]),
  buyWithCourier:a=>args(a,1)&&item(a[0]),
};

export const validHero = value => typeof value === 'string' && Object.hasOwn(HEROES,value);
export const validName = value => typeof value === 'string' && value.trim().length>=1 && value.trim().length<=24 && !/[\u0000-\u001f\u007f]/.test(value);
export const messageHasOnly = exact;

function guardedSlots(action,a) {
  if(action === 'moveItem') return [[a[0],a[1]],[a[2],a[3]]];
  if(['sellItem','setCombineLock','disassembleItem','dropItem'].includes(action)) return [[a[0],a[1]]];
  if(action === 'useItem') return [[a[2]??'inventory',a[0]]];
  if(action === 'recall') return [['tp',0]];
  return [];
}

export function executeCommand(game, actorId, message) {
  const fail = reason => ({ok:false,reason});
  if(!exact(message,['type','id','action','args','slotGuards']) || !Object.hasOwn(validators,message.action) || !validators[message.action](message.args)) return fail('无效的操作或参数');
  const required = guardedSlots(message.action,message.args);
  const guards = message.slotGuards ?? [];
  if(!Array.isArray(guards) || guards.length>4 || guards.some(g=>!exact(g,['area','index','uid'])||!slot(g.area,g.index)||!(g.uid===null||id(g.uid)))) return fail('无效的物品校验');
  return game.withActor(actorId, actor => {
    for(const [area,index] of required) {
      const matches=guards.filter(g=>g.area===area&&g.index===index);
      const uid=actor[area]?.[index] ? actor[area+'Meta']?.[index]?.uid : null;
      if(matches.length!==1 || matches[0].uid!==uid) return fail('物品栏已更新，请重试');
      if(uid && actor[area+'Meta'][index].ownerId!==actor.id && !actor[area+'Meta'][index].freeRapier) return fail('该物品不属于此玩家');
    }
    const action=message.action,a=message.args.map(value=>value===null?undefined:value);
    if(['cast','castExtra','useItem'].includes(action)&&a[1]?.self)a[1]=actor;
    if(['moveTo','setMovement','attackTarget','cast','castExtra','useItem','toggleAutocast','pickupItem'].includes(action)) {
      const allowed = game._canAct(actor);
      if(!allowed.ok) return allowed;
      if(game._tauntSource(actor)) return fail('嘲讽期间无法执行此操作');
    }
    if(action==='attackTarget') {
      const target=game.entities.find(e=>e.id===a[0]);
      if(!target||target.dead||target.hp<=0||target.team===actor.team) return fail('无效的攻击目标');
    }
    if(action==='pickupItem') return game.pickupOrApproach(a[0]);
    const result=game[action](...a);
    return result === undefined ? {ok:true} : typeof result === 'boolean' ? {ok:result,...(!result?{reason:'操作未执行'}:{})} : result;
  });
}
