export const BINDINGS_KEY='af-keybindings-v1';
export const defaultBindings=()=>({skills:['q','w','e','r'],items:['1','2','3','4','5','6']});
const reserved=new Set(['b','g','h','m','p','u']);
export const keyLabel=key=>String(key).toUpperCase();
export function bindingKey(key){return typeof key==='string'&&/^[a-z0-9]$/i.test(key)&&!reserved.has(key.toLowerCase())?key.toLowerCase():null;}
export function validateBindings(value){
 if(!value||!Array.isArray(value.skills)||value.skills.length!==4||!Array.isArray(value.items)||value.items.length!==6)return '需要设置 4 个技能键和 6 个物品键。';
 const seen=new Map();
 for(const [group,count]of [['skills',4],['items',6]])for(let i=0;i<count;i++){
  const key=bindingKey(value[group][i]),name=`${group==='skills'?'技能':'物品'} ${i+1}`;
  if(!key)return `${name}：请使用字母或数字；B / G / H / M / P / U 保留给回城、快捷购买、指南、地图、暂停和天赋。`;
  if(seen.has(key))return `${keyLabel(key)} 重复：${seen.get(key)} 与 ${name}。请修改其中一个键位。`;
  seen.set(key,name);
 }
 return '';
}
let current=defaultBindings();
export const getBindings=()=>({skills:[...current.skills],items:[...current.items]});
export function loadBindings(storage){
 current=defaultBindings();
 try{const value=JSON.parse(storage?.getItem(BINDINGS_KEY)||'null');if(value&&!validateBindings(value))current={skills:value.skills.map(k=>k.toLowerCase()),items:value.items.map(k=>k.toLowerCase())};}catch{}
 return getBindings();
}
export function saveBindings(value,storage){
 const reason=validateBindings(value);if(reason)return {ok:false,reason};
 const normalized={skills:value.skills.map(k=>k.toLowerCase()),items:value.items.map(k=>k.toLowerCase())};
 try{if(!storage)throw new Error();storage.setItem(BINDINGS_KEY,JSON.stringify(normalized));}catch{return {ok:false,reason:'浏览器无法保存键位，请检查本地存储设置。'};}
 current=normalized;return {ok:true};
}
export const skillKey=index=>keyLabel(current.skills[index]);
export const itemKey=index=>keyLabel(current.items[index]);
export function coreBinding(key){
 key=key.toLowerCase();let index=current.skills.indexOf(key);
 if(index>=0)return {type:'skill',index};index=current.items.indexOf(key);
 return index>=0?{type:'item',index}:null;
}
// Additional abilities keep D/T when available, otherwise use free keys in a stable order.
export function extraKey(officialKey){
 const used=new Set([...current.skills,...current.items,...reserved,'a','s','f']);
 const result=[];
 for(const preferred of ['d','t']){const key=[preferred,'z','x','c','v','n','j','k','l','o','i','7','8','9','0'].find(k=>!used.has(k));result.push(key);used.add(key);}
 return keyLabel(result[officialKey?.toLowerCase()==='t'?1:0]);
}
export const shopKey=()=>coreBinding('f')?'Tab':'F / Tab';
