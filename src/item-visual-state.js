const attributes={strength:{name:'力量',color:'#ef7058',image:'str'},agility:{name:'敏捷',color:'#80d36a',image:'agi'},intelligence:{name:'智力',color:'#69baf5',image:'int'}};
export function itemVisualState(item,meta){
 if(item?.id==='ward_dispenser'){
  const mode=meta?.mode==='sentry'?'sentry':'observer';
  return {mode,label:mode==='sentry'?'岗哨':'侦查',color:mode==='sentry'?'#69baf5':'#dfca66',image:`assets/items/ward_${mode}.png`};
 }
 if(item?.id==='power_treads'){
  const mode=attributes[meta?.mode]?meta.mode:'strength',attribute=attributes[mode];
  return {mode,label:attribute.name,color:attribute.color,image:`assets/items/power_treads_${attribute.image}.png`};
 }
 if(['armlet','berserkers_sabatons'].includes(item?.id)){
  const mode=meta?.mode==='on'?'on':'off';
  return {mode,label:mode==='on'?'开启':'关闭',color:mode==='on'?'#ed6852':'#677886',image:item.id==='armlet'&&mode==='on'?'assets/items/armlet_active.png':item.image};
 }
 if(['radiance','rapier'].includes(item?.id)){
  const mode=meta?.mode||(item.id==='rapier'?'attack':'on');
  return {mode,label:item.id==='rapier'?(mode==='spell'?'法术':'攻击'):(mode==='off'?'关闭':'开启'),color:mode==='off'?'#677886':mode==='spell'?'#a18ce4':'#e2c16a',image:item.image};
 }
 return null;
}
