import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { createCoopServer } from '../server/coop-server.mjs';

const { checkPublicCoop } = await import('../scripts/check-public-coop.mjs').catch(() => ({}));

async function endpoint(t, onConnection) {
  const server = http.createServer((_request, response) => { response.writeHead(404); response.end(); });
  const websocket = onConnection && new WebSocketServer({ server, path: '/ws/coop' });
  websocket?.on('connection', onConnection);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const client of websocket?.clients || []) client.terminate();
    websocket?.close();
    await new Promise(resolve => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('public check sends browser Origin and only hello, without joining a human seat', async t => {
  const service = createCoopServer({ root: process.cwd(), host: '127.0.0.1', port: 0, autoTick: false });
  await service.listen();
  t.after(() => service.close());
  const base = `http://127.0.0.1:${service.server.address().port}`;
  const requests = [], messages = [];
  service.websocket.on('connection', (socket, request) => {
    requests.push({ path: request.url, origin: request.headers.origin });
    socket.on('message', data => messages.push(JSON.parse(data.toString())));
  });
  assert.equal(typeof checkPublicCoop, 'function', 'public check must exist');
  await checkPublicCoop(base);
  assert.deepEqual(requests, [{ path: '/ws/coop', origin: base }]);
  assert.deepEqual(messages, [{ type: 'hello' }]);
  assert.equal(service.manager.rooms.size, 0);
});

test('public check rejects ordinary HTTP 404 from a proxy missing WebSocket Upgrade', async t => {
  const base = await endpoint(t);
  await assert.rejects(checkPublicCoop(base), /404/);
});

test('an open socket without a welcome fails within the handshake deadline', async t => {
  const base = await endpoint(t, () => {});
  await assert.rejects(checkPublicCoop(base, 100), /timed out/i);
});

test('a protocol error cannot be mistaken for a successful multiplayer handshake', async t => {
  const base = await endpoint(t, socket => socket.on('message', () => socket.send('{"type":"error"}')));
  await assert.rejects(checkPublicCoop(base), /welcome/i);
});

test('a socket closed before welcome fails instead of reporting success', async t => {
  const base = await endpoint(t, socket => socket.close());
  await assert.rejects(checkPublicCoop(base), /closed/i);
});
