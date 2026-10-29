import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const args = process.argv.slice(2);
let port = Number(process.env.PORT || args[args.indexOf('--port') + 1]) || 5184;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if (!(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
});
let retries = 0;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && retries++ < 15) {
    port++;
    server.listen(port, '127.0.0.1');
  } else { console.error(error.message); process.exitCode = 1; }
});
server.on('listening', () => console.log(`Ancient Front ready at http://localhost:${port}`));
server.listen(port, '127.0.0.1');
