import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createCoopServer } from '../server/coop-server.mjs';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

// Keep obsolete responses cached for four hours, as observed on the public
// site. The new build must work while those exact URLs still serve old code.
const cache = new Map([
  ['/src/main.js', {type:'text/javascript', body:'window.staleEntryLoaded = true;'}],
  ['/src/bot-ai.js', {type:'text/javascript', body:'window.staleAILoaded = true;'}],
  ['/src/renderer.js', {type:'text/javascript', body:'window.staleRendererLoaded = true;'}],
  ['/src/style.css', {type:'text/css', body:'body { display: none; }'}],
]);
const production = createCoopServer({root:resolve('dist'), host:'127.0.0.1', port:0, autoTick:false});
await production.listen();
const upstream = `http://127.0.0.1:${production.server.address().port}`;
let deployed = false;
const proxy = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, upstream), key = url.pathname+url.search;
    if (!deployed && url.pathname === '/') {
      response.writeHead(200, {'Content-Type':'text/html', 'Cache-Control':'no-cache'}).end(
        '<!doctype html><link rel="stylesheet" href="/src/style.css">'+
        '<script type="module" src="/src/main.js"></script>'+
        '<script type="module" src="/src/bot-ai.js"></script>'+
        '<script type="module" src="/src/renderer.js"></script>');
      return;
    }
    let entry = cache.get(key);
    if (!entry) {
      const result = await fetch(url, {signal:AbortSignal.timeout(15000)});
      entry = {status:result.status, type:result.headers.get('content-type'), body:Buffer.from(await result.arrayBuffer())};
      if (url.pathname.startsWith('/src/')) cache.set(key, entry);
    }
    response.writeHead(entry.status || 200, {
      'Content-Type':entry.type || 'application/octet-stream',
      'Cache-Control':url.pathname.startsWith('/src/') ? 'max-age=14400' : 'no-cache',
    }).end(entry.body);
  } catch (error) {
    response.writeHead(502).end(error.message);
  }
});
proxy.listen(0, '127.0.0.1');
await once(proxy, 'listening');
const base = `http://127.0.0.1:${proxy.address().port}`;
await mkdir('artifacts', {recursive:true});
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:1366, height:768}});
const page = await context.newPage(), errors = [], requests = [];
page.on('pageerror', error => {if (deployed) errors.push(error.message);});
page.on('request', request => {
  if (deployed && ['script','stylesheet'].includes(request.resourceType()) && new URL(request.url()).pathname.startsWith('/src/')) requests.push(request.url());
});
page.on('response', response => {if (deployed && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);});
page.on('dialog', dialog => dialog.dismiss());
try {
  await page.goto(base, {waitUntil:'networkidle'});
  await page.waitForFunction(() => window.staleEntryLoaded && window.staleAILoaded && window.staleRendererLoaded);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).display), 'none');
  console.log('PASS Obsolete entry, AI, renderer and styles are cached before deployment');

  deployed = true;
  await page.goto(base, {waitUntil:'networkidle'});
  await closeDevelopmentNotice(page);
  const revision = await page.locator('meta[name="game-build"]').getAttribute('content');
  assert.match(revision, /^[a-f0-9]{64}$/);
  await page.evaluate(async () => {
    // Absolute dynamic imports must resolve to the same Renderer instance as
    // main.js, so recovery and browser tooling do not create a second graph.
    const {Renderer} = await import('/src/renderer.js'), render = Renderer.prototype.render;
    Renderer.prototype.render = function(game, time) {
      window.observedGame = game; window.observedRenderer = this;
      return render.call(this, game, time);
    };
  });
  await page.locator('#difficulty').selectOption('hard');
  await page.locator('#start-game').click();
  await page.waitForFunction(() => window.observedGame?.time > 1);
  const progress = await page.evaluate(async () => {
    const {TEAM_LANES} = await import('/src/map-data.js'), game = window.observedGame;
    const start = {x:game.player.x, y:game.player.y};
    const bots = game.entities.filter(h => h.kind === 'hero' && !h.isPlayer).map(hero => ({
      hero, path:TEAM_LANES[hero.team][hero.lane], furthest:-Infinity,
    }));
    for (let frame=0; frame<750; frame++) {
      game.step(1/30);
      for (const bot of bots) {
        const from = bot.path[1], to = bot.path[2], dx = to.x-from.x, dy = to.y-from.y;
        bot.furthest = Math.max(bot.furthest, ((bot.hero.x-from.x)*dx+(bot.hero.y-from.y)*dy)/Math.hypot(dx,dy));
      }
    }
    game.setPaused(true);
    window.observedRenderer.lookAt(bots[0].hero.x, bots[0].hero.y);
    window.observedRenderer.followPlayer = false;
    return {time:game.time, playerMovement:Math.hypot(game.player.x-start.x,game.player.y-start.y), bots:bots.map(({hero,furthest}) => ({
      id:hero.id, hero:hero.heroId, team:hero.team, lane:hero.lane, x:hero.x, y:hero.y, furthest,
    }))};
  });
  assert.equal(progress.playerMovement, 0);
  assert.equal(progress.bots.length, 9);
  assert.ok(progress.bots.every(bot => bot.furthest > 600), JSON.stringify(progress.bots));
  assert.ok(requests.length > 40, 'The test must observe the real game module graph');
  for (const request of requests) assert.equal(new URL(request).searchParams.get('v'), revision, request);
  assert.ok(requests.some(request => new URL(request).pathname === '/src/bot-ai.js'));
  assert.equal(await page.evaluate(() => !!(window.staleEntryLoaded || window.staleAILoaded || window.staleRendererLoaded)), false);
  assert.match(await page.evaluate(async () => (await fetch('/src/bot-ai.js')).text()), /staleAILoaded/);
  assert.deepEqual(errors, []);
  await page.screenshot({path:'artifacts/release-cache-opening.png'});
  await writeFile('artifacts/release-cache-report.json', JSON.stringify({revision, cacheSeconds:14400, requests, progress, errors}, null, 2));
  console.log('PASS A refreshed production game advances all nine bots past T3 while obsolete cache entries remain');
} finally {
  await browser.close();
  proxy.closeAllConnections();
  await new Promise(resolveClose => proxy.close(resolveClose));
  await production.close();
}
