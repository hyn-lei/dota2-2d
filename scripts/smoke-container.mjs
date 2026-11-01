import assert from 'node:assert/strict';

const base = process.argv[2] || process.env.GAME_URL || 'http://127.0.0.1:8080';
const cases = [
  ['/', /text\/html/, /<title>Ancient Front/],
  ['/src/main.js', /(?:application|text)\/javascript/, /import/],
  ['/src/style.css', /text\/css/, /./s],
  ['/assets/map-7.41.jpg', /image\/jpeg/],
];
const health = await fetch(new URL('/healthz', base), { signal: AbortSignal.timeout(10000) });
assert.equal(health.status, 200);
assert.equal(await health.text(), 'ok\n');
if(process.env.EXPECTED_GAME_REVISION)assert.equal(health.headers.get('x-game-revision'),process.env.EXPECTED_GAME_REVISION,'Container must run the commit being verified');
for (const [path, mime, content] of cases) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type') || '', mime, path);
  assert.match(response.headers.get('cache-control') || '', /no-cache/, path);
  if (content) assert.match(await response.text(), content, path);
  else assert.ok((await response.arrayBuffer()).byteLength > 1000, path);
}
for (const path of ['/missing-file.js', '/package.json', '/README.md', '/scripts/server.mjs', '/.env']) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(10000) });
  assert.ok([403, 404].includes(response.status), `${path} must not be served (received ${response.status})`);
}
console.log('Container HTTP OK: health, page, modules, styles, map, cache headers and excluded files.');
