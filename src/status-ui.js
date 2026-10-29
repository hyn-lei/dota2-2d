import { icon } from './icons.js';

const INFO = {
  dead:{name:'已阵亡',description:'等待复活后返回战场。',positive:false,icon:'skull',order:0},
  stun:{name:'眩晕',description:'无法移动、攻击或施法。',positive:false,icon:'snow',duration:2,order:1},
  root:{name:'缠绕',description:'无法移动。',positive:false,icon:'crystal',duration:2,order:2},
  taunt:{name:'嘲讽',description:'被迫攻击嘲讽来源。',positive:false,icon:'roar',duration:2.5,order:3},
  slow:{name:'减速',description:'移动速度降低。',positive:false,icon:'snow',duration:3,order:4},
  hunger:{name:'战斗饥渴',description:'持续受到伤害，移动速度降低。',positive:false,icon:'hunger',duration:4,order:5},
  invulnerable:{name:'无敌',description:'当前不会受到伤害。',positive:true,icon:'shield',order:1},
  channel:{name:'持续施法',description:'正在引导技能。',positive:true,icon:'storm',order:2},
  recall:{name:'回城中',description:'正在返回泉水；移动或受到伤害会中断回城。',positive:true,icon:'home',duration:3,order:3},
  spin:{name:'剑刃风暴',description:'对附近敌人持续造成伤害。',positive:true,icon:'spin',duration:4},
  call:{name:'狂战士之吼',description:'正在嘲讽附近敌人，并获得防御增益。',positive:true,icon:'roar',duration:2.5},
  haste:{name:'加速',description:'移动速度提高。',positive:true,icon:'boots',duration:5},
  windrun:{name:'风行',description:'获得风行的移动与防御增益。',positive:true,icon:'wind',duration:5},
  rum:{name:'幽灵船朗姆酒',description:'受到幽灵船的保护。',positive:true,icon:'ship',duration:4},
  focus:{name:'集中火力',description:'对目标进行高速攻击。',positive:true,icon:'target',duration:7},
  shield:{name:'伤害减免',description:'受到的伤害降低。',positive:true,icon:'shield',duration:4},
  helix:{name:'反击螺旋',description:'反击螺旋正在生效。',positive:true,icon:'helix',duration:.55},
  tide:{name:'潮汐使者',description:'下一次攻击获得潮汐使者强化。',positive:true,icon:'tide',duration:8},
  aegis:{name:'不朽之守护',description:'死亡后可以原地复活一次。',positive:true,icon:'relic',duration:300}
};
const ALIASES = {
  stunned:'stun',rooted:'root',slowed:'slow',hasted:'haste',bladefury:'spin',
  berserkerscall:'call',battlehunger:'hunger',focusfire:'focus',ghostshiprum:'rum',
  omnislash:'invulnerable',channeling:'channel',freezingfield:'channel'
};
const TIMED = ['stun','root','taunt','slow','hunger','haste','spin','call','windrun','rum','focus','shield','helix','tide','invulnerable','channel'];
const canonical = value => {
  const id = String(value || '').replace(/Until$/, '');
  return ALIASES[id.replace(/[-_\s]/g, '').toLowerCase()] || id;
};

function normalizeStatus(id, raw, time) {
  if (!raw || raw.active === false) return null;
  if(Number.isFinite(raw.startedAt)&&raw.startedAt>time)return null;
  const defaults = INFO[id] || {};
  const until = raw.until;
  if (until != null && until !== Infinity && !Number.isFinite(until)) return null;
  if (Number.isFinite(until) && until <= time) return null;
  const remaining = Number.isFinite(until) ? until - time : null;
  const duration = remaining === null ? null : Math.max(remaining,
    Number.isFinite(raw.duration) && raw.duration > 0 ? raw.duration :
    Number.isFinite(raw.startedAt) ? until - raw.startedAt : defaults.duration || remaining);
  return {
    id, name:String(raw.name || defaults.name || id),
    description:String(raw.description || defaults.description || '当前生效的状态。'),
    remaining, duration, positive:raw.positive ?? defaults.positive ?? true,
    icon:String(raw.icon || defaults.icon || 'relic'),
    stacks:Number.isFinite(raw.stacks) ? Math.max(1, Math.floor(raw.stacks)) : 1
  };
}

/** Read combat state using simulation seconds. This function never mutates a unit. */
export function statusEffects(unit, time = 0) {
  if (!unit) return [];
  const now = Number.isFinite(time) ? time : 0;
  if (unit.dead) {
    const until = unit.respawnTimer > 0 ? now + unit.respawnTimer : Infinity;
    return [normalizeStatus('dead', {until}, now)];
  }
  const effects = new Map(), claimed = new Set();
  const add = (id, raw, authoritative = false) => {
    id = canonical(id);
    if (!id || (!authoritative && claimed.has(id))) return;
    // An expired authoritative entry also suppresses a stale legacy mirror.
    claimed.add(id);
    const effect = normalizeStatus(id, raw, now);
    if (effect) effects.set(id, effect);
  };
  for (const [key, raw] of Object.entries(unit.statuses || {})) {
    if (raw && typeof raw === 'object') add(raw.id || key, raw, true);
  }
  const buffs = unit.buffs || {};
  for (const id of TIMED) {
    const field = `${id}Until`;
    const until = Math.max(Number(buffs[field]) || 0, Number(unit[field]) || 0);
    if (until > now) add(id, {until, startedAt:buffs[`${id}StartedAt`] ?? unit[`${id}StartedAt`],
      duration:buffs[`${id}Duration`] ?? unit[`${id}Duration`], stacks:buffs[`${id}Stacks`] ?? unit[`${id}Stacks`]});
  }
  if (buffs.ultUntil > now) {
    const id = {juggernaut:'invulnerable',crystal_maiden:'channel',windranger:'focus'}[unit.heroId];
    if (id) add(id, {until:buffs.ultUntil});
  }
  for (const [field, id] of [['stunned','stun'],['rooted','root'],['invulnerable','invulnerable'],['isInvulnerable','invulnerable']]) {
    if (unit[field] === true || buffs[field] === true) add(id, {until:Infinity});
  }
  const channel = unit.channel || (typeof unit.channeling === 'object' ? unit.channeling : null);
  if (channel) add('channel', channel);
  else if (unit.channeling === true) add('channel', {until:Infinity});
  if (unit.recallTimer > 0) add('recall', {until:now + unit.recallTimer, duration:3});
  if (unit.aegisUntil > now) add('aegis', {until:unit.aegisUntil, startedAt:unit.aegisStartedAt});
  return [...effects.values()].sort((a, b) =>
    Number(a.positive) - Number(b.positive) || (INFO[a.id]?.order ?? 10) - (INFO[b.id]?.order ?? 10) || a.id.localeCompare(b.id));
}

const bars = new WeakMap();
let nextTooltipId = 0;
const setText = (element, value) => { if (element.textContent !== value) element.textContent = value; };
const setAttr = (element, name, value) => { if (element.getAttribute(name) !== value) element.setAttribute(name, value); };
const seconds = remaining => remaining === null ? '持续生效' : `剩余 ${remaining < 10 ? remaining.toFixed(1) : Math.ceil(remaining)} 秒`;

function positionTooltip(state) {
  const entry = state.nodes.get(state.openId);
  if (!entry || state.tooltip.hidden) return;
  const rect = entry.button.getBoundingClientRect(), tip = state.tooltip.getBoundingClientRect();
  const view = state.bar.ownerDocument.defaultView;
  const left = Math.max(10, Math.min(view.innerWidth - tip.width - 10, rect.left + rect.width / 2 - tip.width / 2));
  const preferredTop = rect.top >= tip.height + 18 ? rect.top - tip.height - 8 : rect.bottom + 8;
  const top = Math.max(10, Math.min(view.innerHeight - tip.height - 10, preferredTop));
  const position = `${Math.round(left)}:${Math.round(top)}`;
  if (state.position !== position) {
    state.tooltip.style.left = `${Math.round(left)}px`;
    state.tooltip.style.top = `${Math.round(top)}px`;
    state.position = position;
  }
}

function refreshTooltip(state) {
  const entry = state.nodes.get(state.openId);
  if (!entry) {
    state.openId = null;
    state.tooltip.hidden = true;
    return;
  }
  const effect = entry.effect;
  setText(state.tooltipName, effect.name);
  setText(state.tooltipDescription, effect.description);
  setText(state.tooltipKind, `${effect.positive ? '增益' : '减益'}${effect.stacks > 1 ? ` · ${effect.stacks} 层` : ''}`);
  setText(state.tooltipTime, seconds(effect.remaining));
  setAttr(state.tooltip, 'data-positive', String(Boolean(effect.positive)));
  state.tooltip.hidden = false;
  positionTooltip(state);
}

function showTooltip(state, id) {
  clearTimeout(state.hideTimer);
  state.openId = id;
  refreshTooltip(state);
}

function releaseTooltip(state) {
  clearTimeout(state.hideTimer);
  state.hideTimer = setTimeout(() => {
    if (state.overTooltip) return;
    const id = state.hoveredId || state.focusedId;
    if (id) showTooltip(state, id);
    else { state.openId = null; state.tooltip.hidden = true; }
  }, 100);
}

/** Mount once; retain the returned element and pass it to updateStatusBar. */
export function mountStatusBar(container) {
  for (const child of container.children) if (bars.has(child)) return child;
  const doc = container.ownerDocument, bar = doc.createElement('div');
  bar.className = 'status-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', '当前状态');
  const tooltipId = `unit-status-tooltip-${++nextTooltipId}`;
  bar.innerHTML = `<span class="status-bar-label" aria-hidden="true">状态</span><span class="status-empty">状态正常</span><div class="status-effects" aria-label="生效中的状态"></div><div class="status-tooltip" id="${tooltipId}" role="tooltip" hidden><div class="status-tooltip-heading"><strong></strong><span></span></div><p></p><small></small></div>`;
  const tooltip = bar.querySelector('.status-tooltip');
  const state = {bar, list:bar.querySelector('.status-effects'), empty:bar.querySelector('.status-empty'),
    tooltip, tooltipName:tooltip.querySelector('strong'), tooltipKind:tooltip.querySelector('.status-tooltip-heading span'),
    tooltipDescription:tooltip.querySelector('p'), tooltipTime:tooltip.querySelector('small'),
    nodes:new Map(), openId:null, hoveredId:null, focusedId:null, overTooltip:false, unitKey:null};
  tooltip.addEventListener('pointerenter', () => { state.overTooltip = true; clearTimeout(state.hideTimer); });
  tooltip.addEventListener('pointerleave', () => { state.overTooltip = false; releaseTooltip(state); });
  bar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !tooltip.hidden) {
      state.openId = null;
      tooltip.hidden = true;
      event.stopPropagation();
      event.preventDefault();
    }
  });
  bars.set(bar, state);
  container.append(bar);
  return bar;
}

function createEffectNode(state, effect) {
  const button = state.bar.ownerDocument.createElement('button');
  button.type = 'button';
  button.className = 'status-effect';
  button.dataset.statusId = effect.id;
  button.setAttribute('aria-describedby', state.tooltip.id);
  button.innerHTML = '<svg class="status-ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="status-ring-track" cx="18" cy="18" r="15.5"/><circle class="status-ring-progress" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="100"/></svg><span class="status-effect-icon" aria-hidden="true"></span><span class="status-effect-time" aria-hidden="true"></span><span class="status-effect-stacks" aria-hidden="true" hidden></span>';
  button.addEventListener('pointerenter', () => { state.hoveredId = effect.id; showTooltip(state, effect.id); });
  button.addEventListener('pointerleave', () => { state.hoveredId = null; releaseTooltip(state); });
  button.addEventListener('focus', () => { state.focusedId = effect.id; showTooltip(state, effect.id); });
  button.addEventListener('blur', () => { state.focusedId = null; releaseTooltip(state); });
  button.addEventListener('click', () => { button.focus({preventScroll:true}); showTooltip(state, effect.id); });
  return {button, effect, symbol:button.querySelector('.status-effect-icon'), time:button.querySelector('.status-effect-time'),
    stacks:button.querySelector('.status-effect-stacks'), ring:button.querySelector('.status-ring-progress'), icon:null};
}

/** Update in place so hovering or focusing an active effect survives HUD ticks. */
export function updateStatusBar(element, unit, time = 0) {
  const state = bars.get(element);
  if (!state) throw new TypeError('Call mountStatusBar before updateStatusBar.');
  const effects = statusEffects(unit, time), unitKey = unit?.id ?? unit;
  if (state.unitKey !== unitKey) {
    state.unitKey = unitKey;
    state.openId = state.hoveredId = state.focusedId = null;
    state.tooltip.hidden = true;
  }
  const currentIds = new Set(effects.map(effect => effect.id));
  for (const [id, entry] of state.nodes) {
    if (!currentIds.has(id)) {
      entry.button.remove();
      state.nodes.delete(id);
      if (state.hoveredId === id) state.hoveredId = null;
      if (state.focusedId === id) state.focusedId = null;
    }
  }
  effects.forEach((effect, index) => {
    let entry = state.nodes.get(effect.id);
    if (!entry) { entry = createEffectNode(state, effect); state.nodes.set(effect.id, entry); }
    entry.effect = effect;
    if (state.list.children[index] !== entry.button) state.list.insertBefore(entry.button, state.list.children[index] || null);
    if (entry.icon !== effect.icon) { entry.symbol.innerHTML = icon(effect.icon); entry.icon = effect.icon; }
    const timer = effect.remaining === null ? '∞' : effect.remaining < 10 ? effect.remaining.toFixed(1) : String(Math.ceil(effect.remaining));
    setText(entry.time, timer);
    setText(entry.stacks, effect.stacks > 1 ? String(effect.stacks) : '');
    entry.stacks.hidden = effect.stacks <= 1;
    setAttr(entry.button, 'data-positive', String(Boolean(effect.positive)));
    const stackLabel = effect.stacks > 1 ? `，${effect.stacks} 层` : '';
    setAttr(entry.button, 'aria-label', `${effect.name}${stackLabel}，${seconds(effect.remaining)}`);
    setAttr(entry.button, 'title', `${effect.name}${stackLabel}\n${effect.description}\n${seconds(effect.remaining)}`);
    const progress = effect.remaining === null || !effect.duration ? 100 : Math.round(effect.remaining / effect.duration * 100);
    setAttr(entry.ring, 'stroke-dashoffset', String(100 - Math.max(0, Math.min(100, progress))));
  });
  state.empty.hidden = effects.length > 0;
  state.list.hidden = effects.length === 0;
  setAttr(element, 'data-count', String(effects.length));
  if (state.openId) refreshTooltip(state);
  return element;
}
