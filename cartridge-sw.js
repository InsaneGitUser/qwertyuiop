// cartridge-sw.js
const CARTRIDGE_PREFIX = '/key/cartridge/';

let fileStore = {};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', e => {
  if (e.data?.type === 'LOAD_CARTRIDGE') {
    fileStore = e.data.files;
    e.source.postMessage({ type: 'CARTRIDGE_READY' });
  } else if (e.data?.type === 'UNLOAD_CARTRIDGE') {
    fileStore = {};
  }
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith(CARTRIDGE_PREFIX)) return;

  let filePath = url.pathname.slice(CARTRIDGE_PREFIX.length);
  if (!filePath || filePath.endsWith('/')) filePath += 'index.html';

  e.respondWith(serveFile(filePath));
});

async function serveFile(filePath) {
  const entry = fileStore[filePath]
    ?? fileStore[Object.keys(fileStore).find(k => k.toLowerCase() === filePath.toLowerCase())]
    ?? (filePath === 'index.html' ? null : fileStore['index.html']);

  if (!entry) {
    return new Response(`Not found in cartridge: ${filePath}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  return new Response(entry.data, {
    status: 200,
    headers: {
      'Content-Type': entry.mime,
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  });
}
