// cartridge-sw.js
// Intercepts all requests to /key/cartridge/*
// and serves files from the loaded cartridge.

const CARTRIDGE_PREFIX = '/key/cartridge/';

// File store: path -> { data, mime }
let fileStore = {};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'LOAD_CARTRIDGE') {
    fileStore = event.data.files || {};

    // Acknowledge load
    event.source?.postMessage({
      type: 'CARTRIDGE_READY'
    });
  }

  if (event.data?.type === 'UNLOAD_CARTRIDGE') {
    fileStore = {};
  }
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only intercept cartridge requests
  if (!url.pathname.startsWith(CARTRIDGE_PREFIX)) {
    return;
  }

  // Remove /key/cartridge/
  let filePath = url.pathname.slice(CARTRIDGE_PREFIX.length);

  // Default document
  if (!filePath || filePath.endsWith('/')) {
    filePath += 'index.html';
  }

  event.respondWith(serveFile(filePath));
});

async function serveFile(filePath) {
  // Exact match
  let entry = fileStore[filePath];

  // Case-insensitive fallback
  if (!entry) {
    const match = Object.keys(fileStore).find(
      k => k.toLowerCase() === filePath.toLowerCase()
    );

    if (match) {
      entry = fileStore[match];
    }
  }

  // SPA fallback
  if (!entry && filePath !== 'index.html') {
    entry = fileStore['index.html'];
  }

  if (!entry) {
    return new Response(
      `Not found in cartridge: ${filePath}`,
      {
        status: 404,
        headers: {
          'Content-Type': 'text/plain'
        }
      }
    );
  }

  return new Response(entry.data, {
    status: 200,
    headers: {
      'Content-Type': entry.mime || 'application/octet-stream',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  });
}
