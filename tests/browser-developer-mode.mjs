import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createCoopServer } from '../server/coop-server.mjs';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

let service, networkService, base = process.env.GAME_URL;
const root = resolve(process.env.STATIC_ROOT || process.cwd());
if (!base) {
  service = createCoopServer({ root, host: '127.0.0.1', port: 0, autoTick: false });
  await service.listen(); base = `http://127.0.0.1:${service.server.address().port}`;
}
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch(), errors = [], checks = [];
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const check = name => { checks.push(name); console.log('PASS ' + name); };
async function observe(page) {
  await page.evaluate(async () => {
    const { Renderer } = await import('/src/renderer.js'), render = Renderer.prototype.render;
    Renderer.prototype.render = function(game, time) { if (game) window.g = game; return render.call(this, game, time); };
  });
}
async function open(ctx, url) {
  const page = await ctx.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(url, { waitUntil: 'networkidle' }); await closeDevelopmentNotice(page); await observe(page);
  return page;
}
async function settings(page) {
  await page.locator('.settings-button').click();
  await page.locator('#developer-mode-settings').scrollIntoViewIfNeeded();
}
async function unlock(page) {
  await page.locator('#developer-mode-toggle').click();
  await page.locator('#developer-password').fill('821027'); await page.locator('#developer-password').press('Enter');
  await page.waitForFunction(() => document.querySelector('#developer-mode-toggle')?.getAttribute('aria-pressed') === 'true');
}
async function state(page, id) {
  return page.evaluate(async id => (await import('/src/developer-mode.js')).developerModeState(g, id || g.player.id), id);
}
async function advance(page) {
  const time = await page.evaluate(() => g.time);
  await page.waitForFunction(time => g.time > time + .12, time);
}
async function assertLocked(page) {
  assert.equal(await page.locator('#developer-mode-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('.developer-mode-controls').count(), 0);
}
let page;
try {
  page = await open(context, base);
  await settings(page); assert.equal(await page.locator('#developer-mode-toggle').isDisabled(), true);
  assert.equal(await page.evaluate(() => document.querySelector('.modal-body').lastElementChild.id), 'developer-mode-settings');
  await page.keyboard.press('Escape');
  await page.locator('[data-hero="juggernaut"]').click(); await page.locator('#start-game').click();
  await page.waitForFunction(() => window.g?.time > .1);
  const ids = await page.evaluate(() => {
    g.entities = g.entities.filter(e => ['hero', 'courier'].includes(e.kind));
    g.nextWave = g.nextNeutralSpawn = g.roshanRespawnAt = 1e9; g._chooseTarget = () => null;
    for (const [index, hero] of g.entities.filter(e => e.kind === 'hero').entries()) {
      Object.assign(hero, { x: 5500 + index * 120, y: hero.team ? 8000 : 5500, aiTimer: Infinity, attackCooldown: 1e9, destination: null });
      if (!hero.isPlayer) hero.cooldowns = [1e9, 1e9, 1e9, 1e9];
    }
    g._index();
    return { own: g.player.id, ally: g.entities.find(e => e.kind === 'hero' && !e.isPlayer && e.team === 0).id, enemy: g.entities.find(e => e.kind === 'hero' && e.team === 1).id };
  });
  await settings(page); const beforeGold = await page.evaluate(() => g.player.gold), beforeTime = await page.evaluate(() => g.time);
  await assertLocked(page); await page.locator('#developer-mode-toggle').click();
  await page.locator('#developer-password').fill('000000'); await page.locator('#developer-password').press('Enter');
  assert.match(await page.locator('#developer-mode-status').textContent(), /密码错误/);
  assert.equal(await page.evaluate(() => g.player.gold), beforeGold); await assertLocked(page);
  await page.locator('#developer-password').fill('821027'); await page.locator('#developer-password').press('Enter');
  assert.equal(await page.evaluate(() => g.player.gold), 99999); assert.equal(await page.evaluate(() => g.time), beforeTime);
  assert.equal(await page.locator('#developer-hero option').count(), 10);
  assert.deepEqual(await state(page), { enabled: true, health: false, mana: false });
  assert.equal(await page.locator('.match-settings-button').evaluate(el => el.classList.contains('developer-mode-active')), true);
  check('Settings ends with a password gate; lobby access and wrong passwords are blocked, correct Enter unlocks 99999 gold without advancing the match');

  await page.locator('#developer-level').fill('10'); await page.locator('#developer-level-apply').click();
  assert.deepEqual(await page.evaluate(() => [g.player.level, g.player.skillPoints, g.player.talentPoints]), [10, 10, 1]);
  await page.locator('#developer-hero').selectOption(ids.ally); await page.locator('#developer-level').fill('15'); await page.locator('#developer-level-apply').click();
  assert.equal(await page.evaluate(id => g.entities.find(e => e.id === id).level, ids.ally), 15);
  await page.locator('#developer-level').fill('10'); await page.locator('#developer-level-apply').click();
  assert.match(await page.locator('#developer-mode-status').textContent(), /不能低于/);
  assert.equal(await page.evaluate(id => g.entities.find(e => e.id === id).level, ids.ally), 15);
  await page.locator('#developer-level').fill('15.5'); await page.locator('#developer-level-apply').click();
  assert.match(await page.locator('#developer-mode-status').textContent(), /整数/);
  await page.locator('#developer-hero').selectOption(ids.enemy); await page.locator('#developer-level-max').click(); await page.locator('#developer-gold').click();
  assert.deepEqual(await page.evaluate(id => { const h = g.entities.find(e => e.id === id); return [h.level, h.gold, h.abilityLevels, h.talents.length]; }, ids.enemy), [30, 99999, [4, 4, 4, 3], 8]);
  assert.equal(await page.evaluate(() => g.player.level), 10);
  await page.locator('#developer-hero').selectOption(ids.own); await page.locator('#developer-level-max').click();
  assert.equal(await page.evaluate(() => g.player.level), 30); assert.equal(await page.locator('#developer-level-max').isDisabled(), true);
  check('The UI upgrades self, allied AI and enemy AI independently; chosen levels and full level grant legal points/builds, and invalid levels are rejected');

  await page.evaluate(() => { g.player.hp = 100; g.player.mana = 20; });
  await page.locator('#developer-health').click();
  assert.equal(await page.evaluate(() => g.player.hp === g.player.maxHp), true); assert.equal(await page.evaluate(() => g.player.mana), 20);
  await page.locator('#developer-mana').click(); assert.equal(await page.evaluate(() => g.player.mana === g.player.maxMana), true);
  await page.locator('#developer-hero').selectOption(ids.ally);
  assert.equal(await page.locator('#developer-health').getAttribute('aria-pressed'), 'false'); await page.locator('#developer-health').click();
  await page.locator('#developer-hero').selectOption(ids.enemy);
  assert.deepEqual(await state(page, ids.enemy), { enabled: true, health: false, mana: false });
  await page.locator('#developer-hero').selectOption(ids.own);
  assert.equal(await page.locator('#developer-health').getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('#developer-mana').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('Escape'); await page.evaluate(() => { g.player.hp = 100; g.player.mana = 20; }); await advance(page);
  assert.equal(await page.evaluate(() => g.player.hp === g.player.maxHp && g.player.mana === g.player.maxMana), true);
  await settings(page); await page.locator('#developer-mana').click(); await page.keyboard.press('Escape');
  await page.evaluate(() => { g.player.hp = 100; g.player.mana = 20; }); await advance(page);
  assert.equal(await page.evaluate(() => g.player.hp === g.player.maxHp && g.player.mana < g.player.maxMana), true);
  await settings(page); await page.locator('#developer-health').click(); await page.locator('#developer-mana').click(); await page.keyboard.press('Escape');
  await page.evaluate(() => { g.player.hp = 100; g.player.mana = 20; }); await advance(page);
  assert.equal(await page.evaluate(() => g.player.hp < g.player.maxHp && g.player.mana === g.player.maxMana), true);
  check('Health and mana switches refill independently in the running game and remember separate settings for each hero');

  await settings(page); await page.locator('#developer-mode-toggle').click();
  assert.deepEqual(await state(page), { enabled: false, health: false, mana: false });
  assert.deepEqual(await state(page, ids.ally), { enabled: false, health: false, mana: false });
  assert.equal(await page.evaluate(() => g.player.level), 30); await assertLocked(page);
  await page.keyboard.press('Escape'); await page.evaluate(() => { g.player.hp = 100; g.player.mana = 20; }); await advance(page);
  assert.equal(await page.evaluate(() => g.player.hp < g.player.maxHp && g.player.mana < g.player.maxMana), true);
  await settings(page); await unlock(page); assert.deepEqual(await state(page), { enabled: true, health: false, mana: false });
  await page.keyboard.press('Escape'); await page.evaluate(() => { window.exitedGame = g; });
  await page.locator('#pause-button').click(); await page.locator('#back-lobby').click();
  assert.equal(await page.evaluate(async () => (await import('/src/developer-mode.js')).developerModeState(exitedGame).enabled), false);
  await page.locator('#resume-game').click(); await page.waitForSelector('.modal'); await page.locator('[data-close]').last().click();
  await settings(page); await assertLocked(page); assert.equal(await page.evaluate(() => g.player.level), 30);
  check('Closing developer mode stops all extra recovery and requires the password again; leaving and resuming retains upgrades with developer mode off');

  await unlock(page); await page.keyboard.press('Escape'); await page.locator('#pause-button').click(); await page.locator('#back-lobby').click();
  await page.locator('#start-game').click(); await page.waitForFunction(() => g.player.level === 1 && !g.paused);
  await settings(page); await assertLocked(page); await unlock(page);
  await page.locator('#developer-level').fill('8'); await page.locator('#developer-level-apply').click(); await page.locator('#developer-health').click();
  await page.reload({ waitUntil: 'networkidle' }); await closeDevelopmentNotice(page); await observe(page);
  await page.locator('#resume-game').click(); await page.waitForSelector('.modal'); await page.locator('[data-close]').last().click();
  await settings(page); await assertLocked(page); assert.equal(await page.evaluate(() => g.player.level), 8);
  await unlock(page);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await assertLocked(page);
  check('New matches, page reload recovery and browser back-cache return all require a fresh developer unlock');

  await page.locator('[data-binding-group="skills"][data-binding-index="0"]').click(); await page.keyboard.press('j');
  await page.locator('[data-binding-group="skills"][data-binding-index="1"]').click();
  await page.locator('#developer-mode-toggle').click(); await page.locator('#developer-password').fill('821027');
  assert.equal(await page.locator('.keybinding-slot.capturing').count(), 0);
  assert.equal(await page.locator('#save-settings').isDisabled(), false);
  await page.locator('#developer-password').press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.type), 'submit');
  await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'developer-password');
  await page.locator('#developer-password').press('Enter');
  assert.equal(await page.locator('[data-binding-group="skills"][data-binding-index="0"] kbd').textContent(), 'J');
  assert.equal(await page.locator('#ability-0 kbd').textContent(), 'Q');
  await page.locator('#save-settings').click(); assert.equal(await page.locator('#ability-0 kbd').textContent(), 'J');
  await settings(page); await page.locator('#reset-keybindings').click(); await page.locator('#save-settings').click();
  check('Password and level inputs participate in keyboard focus without consuming skill shortcuts or discarding unsaved keybindings');

  await settings(page);
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await page.locator('#developer-mode-settings').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('#developer-hero').isVisible(), true);
    assert.equal(await page.locator('#developer-health').isVisible(), true); assert.equal(await page.locator('#developer-mana').isVisible(), true);
    await page.locator('#developer-mana').click(); await page.locator('#developer-mana').click();
    await page.locator('#developer-mode-settings').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/developer-mode-settings-${viewport.width}.png` });
  }
  check('Developer controls remain usable with a visible save footer on laptop and 390-pixel mobile screens');

  networkService = service;
  if (!networkService) { networkService = createCoopServer({ root, host: '127.0.0.1', port: 0, autoTick: false }); await networkService.listen(); }
  const networkContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const network = await open(networkContext, `http://127.0.0.1:${networkService.server.address().port}`);
  await network.locator('#quick-coop-room').click(); await network.waitForFunction(() => document.querySelector('#coop-connection')?.textContent.includes('已连接'));
  await network.locator('#coop-name').fill('Developer boundary'); await network.locator('#coop-create').click(); await network.waitForSelector('#coop-room-code');
  await network.locator('#coop-ready').click(); await network.locator('#coop-start').click(); await network.waitForFunction(() => window.g?.isNetwork);
  await settings(network); await assertLocked(network);
  assert.equal(await network.locator('#developer-mode-toggle').isDisabled(), true);
  assert.match(await network.locator('#developer-mode-settings').textContent(), /联机房间不可用/);
  assert.equal(await network.evaluate(async () => {
    const dev = await import('/src/developer-mode.js'), before = g.player.gold;
    return !dev.enableDeveloperMode(g, '821027').ok && !dev.setDeveloperLevel(g, g.player.id, 30).ok && g.player.gold === before;
  }), true);
  await networkContext.close();
  check('A real server-backed room with one human and AI allies blocks both the UI and developer mutations');
  assert.deepEqual(errors, []);
  await writeFile('artifacts/developer-mode-browser-report.json', JSON.stringify({ base, checks, errors }, null, 2) + '\n');
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: 'artifacts/developer-mode-browser-failure.png' });
  throw error;
} finally {
  await context.close(); await browser.close();
  if (networkService !== service) await networkService?.close();
  await service?.close();
}
