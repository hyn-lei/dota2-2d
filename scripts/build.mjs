import { createHash } from 'node:crypto';
import { mkdir, cp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

async function files(directory) {
  const entries = await readdir(directory, {withFileTypes:true});
  return (await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }))).flat();
}

const html = await readFile('index.html', 'utf8');
const sources = (await files('src')).sort();
const contents = await Promise.all(sources.map(path => readFile(path)));
const hash = createHash('sha256').update(html);
for (let index=0; index<sources.length; index++) {
  hash.update('\0'+relative('.', sources[index]).replaceAll('\\','/')+'\0').update(contents[index]);
}
const revision = hash.digest('hex');
const imports = Object.fromEntries(sources.filter(path => path.endsWith('.js')).map(path => {
  const url = '/'+relative('.', path).replaceAll('\\','/');
  return [url, `${url}?v=${revision}`];
}));
// Import maps also version relative dependencies and dynamic imports. A query
// on main.js alone would still let browsers reuse cached, unversioned AI code.
const importMap = JSON.stringify({imports}).replaceAll('<','\\u003c');
const builtHTML = html
  .replace(/(\b(?:src|href)=["'])(\/src\/[^"']+\.(?:js|css))(["'])/g, `$1$2?v=${revision}$3`)
  .replace('</head>', `  <meta name="game-build" content="${revision}" />\n  <script type="importmap">${importMap}</script>\n</head>`);

await mkdir('dist', {recursive:true});
for (const file of ['index.html','src','assets']) await cp(file, `dist/${file}`, {recursive:true});
await writeFile('dist/index.html', builtHTML);
console.log(`Built standalone static game in dist/; frontend version ${revision}`);
