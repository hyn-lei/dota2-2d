import {getBindings,defaultBindings,bindingKey,keyLabel,validateBindings,saveBindings,extraKey,shopKey} from './keybindings.js';

export function keybindingsHTML(){
 return `<section class="keybinding-settings" aria-labelledby="keybinding-title"><h3 id="keybinding-title">键位设置</h3><p>点击键位后按下新按键。保存后立即生效，并保存在当前浏览器。</p>${[['skills','技能键位',4],['items','物品键位',6]].map(([group,title,count])=>`<fieldset><legend>${title}</legend><div class="keybinding-grid ${group}">${Array.from({length:count},(_,i)=>`<button type="button" class="keybinding-slot" data-binding-group="${group}" data-binding-index="${i}" aria-label="修改${title} ${i+1}"><span>${group==='skills'?'技能':'物品'} ${i+1}</span><kbd></kbd></button>`).join('')}</div></fieldset>`).join('')}<p class="keybinding-status" role="status" aria-live="polite"></p><p class="keybinding-help">Ctrl + 技能键加点；Alt + 技能 / 物品键对自己施放。方向键移动，Tab 打开商店。B / G / H / M / P / U 保留原功能。</p><div class="keybinding-actions"><button type="button" id="reset-keybindings">恢复默认键位</button><span>Esc 取消录入；关闭窗口放弃未保存的键位</span></div></section>`;
}
export function mountKeybindings(root,{storage,onSave}){
 let draft=getBindings(),capture=null,message='';
 const status=root.querySelector('.keybinding-status'),save=root.querySelector('#save-settings');
 function update(){
  const error=validateBindings(draft);
  for(const button of root.querySelectorAll('[data-binding-group]')){
   const group=button.dataset.bindingGroup,index=+button.dataset.bindingIndex,active=capture?.group===group&&capture.index===index;
   button.classList.toggle('capturing',active);button.setAttribute('aria-pressed',String(active));
   button.querySelector('kbd').textContent=active?'按键…':keyLabel(draft[group][index]);
   button.setAttribute('aria-label',`${group==='skills'?'技能':'物品'} ${index+1}：${keyLabel(draft[group][index])}，点击修改`);
  }
  status.textContent=message||error||(capture?'按下一个字母或数字，Esc 取消录入。':'键位可用。');status.classList.toggle('invalid',!!error||!!message);save.disabled=!!error||!!capture;
 }
 root.querySelectorAll('[data-binding-group]').forEach(button=>button.onclick=()=>{capture={group:button.dataset.bindingGroup,index:+button.dataset.bindingIndex};message='';update();});
 root.querySelector('#reset-keybindings').onclick=()=>{draft=defaultBindings();capture=null;message='';update();};
 save.onclick=()=>{const result=saveBindings(draft,storage);if(!result.ok){message=result.reason;update();return;}capture=null;onSave({extra:[extraKey('D'),extraKey('T')],shop:shopKey()});};
 update();
 return {handleKey(event){
  if(!capture)return false;event.preventDefault();event.stopPropagation();
  if(event.repeat)return true;
  if(event.key==='Escape'){capture=null;message='';update();return true;}
  const key=bindingKey(event.key);
  if(!key||event.ctrlKey||event.altKey||event.metaKey){message='请按单个字母或数字；B / G / H / M / P / U 为保留键。';update();return true;}
  draft[capture.group][capture.index]=key;capture=null;message='';update();return true;
 }};
}
