import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

// Verify the browser's public route without creating a room or occupying a seat.
export async function checkPublicCoop(base, timeoutMs = 10000) {
  const url = new URL('/ws/coop', base);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Public game URL must use HTTP or HTTPS');
  const origin = url.origin;
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { origin, maxPayload: 8192 });
    let settled = false;
    const timeout = setTimeout(() => finish(new Error('Public WebSocket handshake timed out')), timeoutMs);
    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.terminate();
      if (error) reject(error); else resolve();
    }
    socket.on('open', () => socket.send(JSON.stringify({ type: 'hello' })));
    socket.on('message', data => {
      let message;
      try { message = JSON.parse(data.toString()); } catch { finish(new Error('Public WebSocket returned an invalid welcome')); return; }
      finish(message?.type === 'welcome' ? undefined : new Error('Public WebSocket did not return welcome'));
    });
    socket.on('error', error => finish(new Error(`Public WebSocket handshake failed: ${error.message}`)));
    socket.on('close', () => finish(new Error('Public WebSocket closed before welcome')));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await checkPublicCoop(process.argv[2] || process.env.GAME_URL || 'https://dota2.prismabyss.com');
    console.log('Public WebSocket OK: browser Origin accepted and hello returned welcome.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
