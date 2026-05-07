// cartridge-sw.js
// Intercepts all requests to /cartridge/* and serves files from the loaded cartridge.

const CARTRIDGE_PREFIX = '/cartridge/';

// File store: path -> { data: Uint8Array|string, type: string }
let fileStore = {};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('message', e => {
  if (e.data?.type === 'LOAD_CARTRIDGE') {
    fileStore = e.data.files; // { 'index.html': { data: Uint8Array, mime: string }, ... }
    // Acknowledge
    e.source.postMessage({ type: 'CARTRIDGE_READY' });
  } else if (e.data?.type === 'UNLOAD_CARTRIDGE') {
    fileStore = {};
  }
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (!url.pathname.startsWith(CARTRIDGE_PREFIX)) return;

  // Strip the /cartridge/ prefix to get the file path within the zip
  let filePath = url.pathname.slice(CARTRIDGE_PREFIX.length);

  // Default to index.html for directory-style requests
  if (!filePath || filePath.endsWith('/')) filePath += 'index.html';

  e.respondWith(serveFile(filePath));
});

async function serveFile(filePath) {
  // Try exact match first, then case-insensitive, then index.html fallback
  let entry = fileStore[filePath]
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
