import {
  DEVELOPER_MAX_LEVEL, DEVELOPER_GOLD, MAX_MATCH_MINUTES, canUseDeveloperMode, developerModeState,
  enableDeveloperMode, disableDeveloperMode, setDeveloperLevel, setDeveloperGold, setDeveloperRecovery, setDeveloperTime,
} from './developer-mode.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const toggle = (id, on, label, disabled = false) => `<button type="button" id="${id}" class="toggle ${on ? 'on' : ''}" aria-pressed="${on}" aria-label="${escape(label)}" ${disabled ? 'disabled' : ''}><i></i></button>`;

export function developerModeHTML() {
  return '<section id="developer-mode-settings" class="developer-mode-settings" aria-labelledby="developer-mode-title"></section>';
}

export function mountDeveloperMode(root, game, { changed = () => {} } = {}) {
  let selectedId = game?.selected?.kind === 'hero' ? game.selected.id : game?.player?.id;
  let unlocking = false, message = '', invalid = false;
  const query = selector => root.querySelector(selector);
  const heroOf = () => game?.entities.find(e => e.id === selectedId && e.kind === 'hero') || game?.player;

  function showMessage(text, failed = false) {
    message = text; invalid = failed;
    const status = query('.developer-mode-status');
    status.textContent = message; status.classList.toggle('invalid', invalid);
  }

  function complete(result, text, focusId) {
    if (!result.ok) { showMessage(result.reason, true); return; }
    message = text; invalid = false;
    render(focusId); changed();
  }

  function render(focusId) {
    const available = canUseDeveloperMode(game), hero = heroOf();
    selectedId = hero?.id;
    const state = developerModeState(game, selectedId);
    const help = available ? '仅限当前单人人机对局，退出后自动关闭' : game?.isNetwork ? '联机房间不可用，请进入单人人机对局' : '进入单人人机对局后可开启';
    root.innerHTML = `<div class="setting-row"><div><strong id="developer-mode-title">是否开启开发者模式</strong><p>${help}</p></div>${toggle('developer-mode-toggle', state.enabled, '开启或关闭开发者模式', !available)}</div>
      <form id="developer-password-form" class="developer-password-form" ${unlocking && !state.enabled ? '' : 'hidden'}>
        <label for="developer-password">输入 6 位数字密码</label>
        <div class="developer-password-entry"><input id="developer-password" type="password" inputmode="numeric" minlength="6" maxlength="6" pattern="[0-9]{6}" autocomplete="off" required aria-describedby="developer-mode-status"/><button type="submit">开启</button></div>
      </form>
      ${state.enabled ? `<div class="developer-mode-controls">
        <div class="developer-time-entry"><label for="developer-time">对局时间（0–${MAX_MATCH_MINUTES} 分钟）<input id="developer-time" type="number" min="0" max="${MAX_MATCH_MINUTES}" step="any" inputmode="decimal" value="${Number((game.time/60).toFixed(2))}" aria-describedby="developer-time-help developer-mode-status"/></label><button type="button" id="developer-time-apply">调整时间</button></div>
        <p id="developer-time-help" class="developer-mode-help">可向前或向后调整；超过 ${MAX_MATCH_MINUTES} 分钟会清除本局存档并刷新页面。</p>
        <label for="developer-hero">目标英雄</label><select id="developer-hero">${game.entities.filter(e => e.kind === 'hero').map(e => `<option value="${escape(e.id)}" ${e.id === selectedId ? 'selected' : ''}>${e.id === game.player.id ? '自己' : e.team === game.player.team ? '友方 AI' : '敌方 AI'} · ${escape(e.name)} · ${e.level} 级${e.dead ? '（阵亡）' : ''}</option>`).join('')}</select>
        <div class="developer-level-entry"><label for="developer-level">目标等级（1–${DEVELOPER_MAX_LEVEL}）<input id="developer-level" type="number" min="${hero.level}" max="${DEVELOPER_MAX_LEVEL}" step="1" value="${Math.min(DEVELOPER_MAX_LEVEL, hero.level + 1)}" aria-describedby="developer-mode-status"/></label><button type="button" id="developer-level-apply" ${hero.level === DEVELOPER_MAX_LEVEL ? 'disabled' : ''}>升到指定等级</button><button type="button" id="developer-level-max" ${hero.level === DEVELOPER_MAX_LEVEL ? 'disabled' : ''}>升到满级（${DEVELOPER_MAX_LEVEL}）</button></div>
        <div class="setting-row"><div><strong>金钱 ${DEVELOPER_GOLD}</strong><p>当前目标金钱 ${Math.floor(hero.gold)}</p></div><button type="button" id="developer-gold">设为 ${DEVELOPER_GOLD}</button></div>
        <div class="setting-row"><div><strong>生命值回复</strong><p>开启后持续补满当前英雄的生命值</p></div>${toggle('developer-health', state.health, `开启或关闭${hero.name}的生命值回复`)}</div>
        <div class="setting-row"><div><strong>魔法值回复</strong><p>开启后持续回复当前英雄的魔法值</p></div>${toggle('developer-mana', state.mana, `开启或关闭${hero.name}的魔法值回复`)}</div>
        <p class="developer-mode-help">可选择自己、队友或敌方英雄。回复开关分别保存；关闭模式后停止额外回复。</p>
      </div>` : ''}
      <p id="developer-mode-status" class="developer-mode-status ${invalid ? 'invalid' : ''}" role="status" aria-live="polite">${escape(message)}</p>`;

    query('#developer-mode-toggle').onclick = () => {
      if (state.enabled) {
        unlocking = false;
        complete(disableDeveloperMode(game), '开发者模式已关闭', 'developer-mode-toggle');
      } else {
        unlocking = !unlocking; message = ''; invalid = false;
        render(unlocking ? 'developer-password' : 'developer-mode-toggle');
      }
    };
    query('#developer-mode-toggle').setAttribute('aria-expanded', String(unlocking || state.enabled));
    query('#developer-password-form').onsubmit = event => {
      event.preventDefault();
      const input = query('#developer-password'), result = enableDeveloperMode(game, input.value);
      input.value = '';
      if (result.ok) unlocking = false;
      complete(result, `开发者模式已开启，你的金钱已设为 ${DEVELOPER_GOLD}`, result.ok ? 'developer-hero' : null);
      if (!result.ok) input.focus();
    };
    if (state.enabled) {
      query('#developer-time-apply').onclick=()=>{
        const minutes=query('#developer-time').valueAsNumber;
        complete(setDeveloperTime(game,minutes),`对局时间已调整为 ${minutes} 分钟`,'developer-time');
      };
      query('#developer-time').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();query('#developer-time-apply').click();}};
      query('#developer-hero').onchange = event => {
        selectedId = event.target.value; message = ''; invalid = false; render('developer-hero');
      };
      query('#developer-level-apply').onclick = () => {
        const level = query('#developer-level').valueAsNumber;
        complete(setDeveloperLevel(game, selectedId, level), `${hero.name}已升到 ${level} 级`, 'developer-level-apply');
      };
      query('#developer-level-max').onclick = () => complete(setDeveloperLevel(game, selectedId, DEVELOPER_MAX_LEVEL), `${hero.name}已升到满级（${DEVELOPER_MAX_LEVEL}）`, 'developer-level-max');
      query('#developer-gold').onclick = () => complete(setDeveloperGold(game, selectedId), `${hero.name}的金钱已设为 ${DEVELOPER_GOLD}`, 'developer-gold');
      for (const [resource, id, label] of [['health', 'developer-health', '生命值回复'], ['mana', 'developer-mana', '魔法值回复']])
        query('#' + id).onclick = () => complete(setDeveloperRecovery(game, selectedId, resource, !state[resource]), `${hero.name}的${label}已${state[resource] ? '关闭' : '开启'}`, id);
    }
    if (focusId) query('#' + focusId)?.focus({ preventScroll: true });
  }
  render();
}
