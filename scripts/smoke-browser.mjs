import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2] || process.env.GAME_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.hero-option').count(), 5);
  await page.waitForFunction(() => {
    const portrait = document.querySelector('#hero-render');
    return portrait?.complete && portrait.naturalWidth > 0;
  });
  await page.locator('#start-game').click();
  await page.locator('canvas').first().waitFor({ state: 'visible' });
  // Let module initialization, the first render and asynchronous assets finish.
  await page.waitForTimeout(3000);
  assert.deepEqual(errors, [], 'The deployed game must load without script or resource errors');
  console.log('Browser startup OK: hero selection, portrait and game canvas load without errors.');
} finally {
  await browser.close();
}
