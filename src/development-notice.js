const reminder='如果打真人比赛，因为当前网页正在频繁开发，网页随时都有可能会刷新。这可能会导致比赛打到一半突然打不了，或者刚开始就被刷掉了。';

function showDevelopmentNotice(){
  const previousFocus=document.activeElement;
  const dialog=document.createElement('dialog');
  dialog.id='development-notice';
  dialog.className='development-notice';
  dialog.setAttribute('aria-labelledby','development-notice-title');
  dialog.setAttribute('aria-describedby','development-notice-copy');
  dialog.setAttribute('aria-modal','true');
  dialog.innerHTML=`<header class="development-notice-header">
    <h2 id="development-notice-title">温馨提示</h2>
    <button class="development-notice-close" type="button" aria-label="关闭温馨提示" autofocus><span aria-hidden="true">×</span></button>
  </header><div class="development-notice-body"><p id="development-notice-copy">${reminder}</p></div>`;
  const close=dialog.querySelector('button');
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Tab'){event.preventDefault();close.focus({preventScroll:true});}
  });
  dialog.addEventListener('close',()=>{
    document.documentElement.classList.remove('development-notice-open');
    dialog.remove();
    const target=previousFocus!==document.body&&previousFocus?.isConnected ? previousFocus : document.querySelector('#start-game, #app button:not(:disabled), #app a[href]');
    target?.focus({preventScroll:true});
  },{once:true});
  document.body.append(dialog);
  document.documentElement.classList.add('development-notice-open');
  dialog.showModal();
  close.focus({preventScroll:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showDevelopmentNotice,{once:true});
else showDevelopmentNotice();
