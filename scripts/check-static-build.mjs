import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { SourceTextModule } from 'node:vm';

const root = resolve(process.argv[2] || 'dist');
const origin = pathToFileURL(`${root}/`);
const modules = new Map();
let references = 0;

function localFile(specifier, parent = origin.href) {
  const url = new URL(specifier.startsWith('/') ? `.${specifier}` : specifier,
    specifier.startsWith('/') ? origin : parent);
  assert.equal(url.protocol, 'file:', `Unexpected external module: ${specifier}`);
  url.search = '';
  url.hash = '';
  const file = fileURLToPath(url);
  const inside = relative(root, file);
  assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside), `Path outside dist: ${specifier}`);
  assert.ok(statSync(file).isFile(), `Missing built file: ${specifier}`);
  references++;
  return pathToFileURL(file).href;
}

function compile(url) {
  if (!modules.has(url)) {
    modules.set(url, new SourceTextModule(readFileSync(fileURLToPath(url), 'utf8'), { identifier: url }));
  }
  return modules.get(url);
}

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = resolve(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const buildRevision = html.match(/<meta\s+name="game-build"\s+content="([a-f0-9]{64})"/)?.[1];
assert.ok(buildRevision, 'The static build must identify its frontend version');
const importMapText = html.match(/<script\s+type="importmap">([\s\S]*?)<\/script>/)?.[1];
assert.ok(importMapText, 'The static build must version the complete module graph');
const importMap = JSON.parse(importMapText).imports;
for (const [specifier, target] of Object.entries(importMap)) {
  assert.equal(localFile(target), localFile(specifier), `Import map must retain the module path: ${specifier}`);
  assert.equal(new URL(target, 'http://localhost').searchParams.get('v'), buildRevision, `Wrong module version: ${specifier}`);
}
const external = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;
const entries = [];
for (const match of html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
  if (external.test(match[1])) continue;
  if (/^\/src\/[^?#]+\.(?:js|css)(?:[?#]|$)/i.test(match[1])) {
    assert.equal(new URL(match[1], 'http://localhost').searchParams.get('v'), buildRevision,
      `Wrong entry or stylesheet version: ${match[1]}`);
  }
  const url = localFile(match[1]);
  if (/^<script\b/i.test(match[0]) && /\btype=["']module["']/i.test(match[0])) entries.push(url);
}
assert.ok(entries.length, 'index.html must contain a module entry point');

for (const file of files(resolve(root, 'src'))) {
  const url = pathToFileURL(file).href;
  if (extname(file) === '.js') {
    const specifier = '/'+relative(root, file).replaceAll('\\','/');
    assert.ok(importMap[specifier], `Module missing from the frontend version map: ${specifier}`);
    compile(url);
  }
  if (extname(file) === '.css') {
    for (const match of readFileSync(file, 'utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) {
      if (!external.test(match[1])) localFile(match[1], url);
    }
  }
}
for (const entry of entries) {
  const module = compile(entry);
  if (module.status === 'unlinked') await module.link((specifier, parent) => compile(localFile(specifier, parent.identifier)));
}
console.log(`Static build OK: ${modules.size} JS modules compiled; entry imports linked; ${references} local references checked.`);
