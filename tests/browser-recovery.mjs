import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createCoopServer } from '../server/coop-server.mjs';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

let service, base = process.env.GAME_URL;
if (!base) {
  service = createCoopServer({ root: process.cwd(), host: '127.0.0.1', port: 0, autoTick: false });
  await service.listen(); base = `http://127.0.0.1:${service.server.address().port}`;
}
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const errors = [], dialogs = [];
let acceptReplacement = false;
const observe = page => page.evaluate(async () => {
  const { Renderer } = await import('/src/renderer.js'); const render = Renderer.prototype.render;
  Renderer.prototype.render = function(game, time) { window.observedGame = game; return render.call(this, game, time); };
});
async function openPage() {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => {
    dialogs.push(dialog.type());
    return dialog.type() === 'beforeunload' || acceptReplacement ? dialog.accept() : dialog.dismiss();
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await closeDevelopmentNotice(page);
  await observe(page);
  return page;
}
const checkpoint = page => page.evaluate(() => JSON.parse(localStorage.getItem('af-single-match-v1')));
try {
  let page = await openPage();
  await page.locator('[data-hero="ogre_magi"]').click(); await page.locator('#start-game').click();
  await page.waitForFunction(() => window.observedGame?.time > .1);
  await page.evaluate(() => {
    const g = window.observedGame;
    if (!g.learnAbility(2).ok || !g.buy('branch').ok || !g.cast(2, g.player).ok) throw new Error('Recovery setup failed');
    g.step(.6);
  });
  await page.locator('#pause-button').click();
  const before = await checkpoint(page), hero = before.state.entities.find(e => e.isPlayer);
  assert.ok(before.state.time > .6); assert.equal(hero.abilityLevels[2], 1); assert.deepEqual(hero.inventory, ['branch']);
  await page.reload({ waitUntil: 'networkidle' }); await closeDevelopmentNotice(page);
  await observe(page);
  assert.ok(dialogs.includes('beforeunload'));
  assert.equal(await page.locator('#resume-game').count(), 1);
  await page.locator('#resume-game').click();
  await page.waitForSelector('#modal-title'); assert.match(await page.locator('#modal-title').textContent(), /已恢复/);
  await page.waitForFunction(() => window.observedGame?.paused === true);
  const restored = await page.evaluate(() => ({ time: window.observedGame.time, paused: window.observedGame.paused, p: window.observedGame.player }));
  assert.equal(restored.time, before.state.time); assert.equal(restored.paused, true);
  for (const field of ['gold', 'xp', 'level', 'inventory', 'inventoryMeta', 'abilityLevels', 'cooldowns', 'statuses']) assert.deepEqual(restored.p[field], hero[field]);
  console.log('PASS Refresh restores the same single-player progress and waits paused');

  await page.locator('[data-close]').filter({ hasText: '继续战斗' }).click();
  await page.waitForFunction(time => window.observedGame.time > time + .1, before.state.time);
  await page.evaluate(() => { if (!window.observedGame.buy('branch').ok) throw new Error('Resumed shop failed'); });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('af-single-match-v1')).state.entities.find(e => e.isPlayer).inventory.length === 2);
  const periodic = await checkpoint(page);
  await page.close(); // A hard tab close can skip unload; the periodic checkpoint must already exist.
  page = await openPage(); const afterClose = await checkpoint(page);
  assert.ok(afterClose.state.time >= periodic.state.time);
  await page.locator('#resume-game').click(); await page.waitForSelector('#modal-title');
  await page.waitForFunction(() => window.observedGame?.paused === true);
  assert.equal(await page.evaluate(() => window.observedGame.time), afterClose.state.time);
  assert.deepEqual(await page.evaluate(() => window.observedGame.player.inventory), ['branch', 'branch']);
  console.log('PASS Closing a tab retains the periodic checkpoint and resumed purchases');

  await page.locator('#back-lobby').click(); await page.waitForSelector('#resume-game');
  const preserved = await checkpoint(page);
  await page.locator('#start-game').click(); assert.ok(dialogs.includes('confirm'));
  assert.equal(await page.locator('.match').count(), 0); assert.equal((await checkpoint(page)).state.time, preserved.state.time);
  for (const viewport of [{ width: 1366, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('#resume-game').isVisible(), true);
    await page.locator('#open-coop').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#open-coop').evaluate(button => {
      const r=button.getBoundingClientRect();const lobby=button.closest('.lobby').getBoundingClientRect();
      return r.bottom<=lobby.bottom && button.contains(document.elementFromPoint(r.x+r.width/2,Math.min(r.bottom-1,innerHeight-1)));
    }), true);
    await page.screenshot({ path: `artifacts/recovery-lobby-${viewport.width}.png`, fullPage: true });
  }
  acceptReplacement = true; await page.locator('#start-game').click(); await page.waitForSelector('.match');
  assert.equal((await checkpoint(page)).state.entities.find(e => e.isPlayer).inventory.length, 0);
  console.log('PASS Returning to the lobby retains progress; new games replace it only after confirmation');

  const denied = await browser.newContext();
  await denied.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key === 'af-single-match-v1') throw new DOMException('Full', 'QuotaExceededError'); return set.call(this, key, value); };
  });
  const failurePage = await denied.newPage(); failurePage.on('pageerror', error => errors.push(error.message));
  await failurePage.goto(base, { waitUntil: 'networkidle' }); await closeDevelopmentNotice(failurePage);
  await failurePage.locator('#start-game').click(); assert.match(await failurePage.locator('#match-mode').textContent(), /存档失败/);
  assert.equal(await failurePage.evaluate(() => localStorage.getItem('af-single-match-v1')), null);
  await denied.close(); assert.deepEqual(errors, []);
  console.log('PASS Storage failure is visible and never claims a saved match');
} finally { await browser.close(); await service?.close(); }
