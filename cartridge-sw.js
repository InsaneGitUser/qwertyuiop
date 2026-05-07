// cartridge-sw.js
const CARTRIDGE_PREFIX = '/key/cartridge/';

// fileStore: path -> { data: Uint8Array, mime: string }
let fileStore = {};
// externalMap: fake path -> real external URL
let externalMap = {};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', e => {
  if (e.data?.type === 'LOAD_CARTRIDGE') {
    fileStore = e.data.files;
    externalMap = parseSpecialFile(fileStore);
    e.source.postMessage({ type: 'CARTRIDGE_READY' });
  } else if (e.data?.type === 'UNLOAD_CARTRIDGE') {
    fileStore = {};
    externalMap = {};
  }
});

// Parse the "special" file from the cartridge.
// Format (one mapping per line):
//   /fake/path = https://real.url/file
// Blank lines and lines starting with # are ignored.
function parseSpecialFile(files) {
  const map = {};
  const entry = files['special'] ?? files['special.txt'];
  if (!entry) return map;

  const text = new TextDecoder().decode(entry.data);
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const fakePath = line.slice(0, eq).trim().replace(/^\//, '');
    const realUrl  = line.slice(eq + 1).trim();
    if (fakePath && realUrl) map[fakePath] = realUrl;
  }
  return map;
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith(CARTRIDGE_PREFIX)) return;

  let filePath = url.pathname.slice(CARTRIDGE_PREFIX.length);
  if (!filePath || filePath.endsWith('/')) filePath += 'index.html';

  e.respondWith(serveFile(filePath, e.request));
});

async function serveFile(filePath, originalRequest) {
  // 1. Check external map first
  const externalUrl = externalMap[filePath]
    ?? externalMap[Object.keys(externalMap).find(k => k.toLowerCase() === filePath.toLowerCase())];

  if (externalUrl) {
    try {
      return await fetch(externalUrl, { method: originalRequest.method });
    } catch (err) {
      return new Response(`Failed to fetch external resource: ${externalUrl}\n${err}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }

  // 2. Check local file store
  const entry = fileStore[filePath]
    ?? fileStore[Object.keys(fileStore).find(k => k.toLowerCase() === filePath.toLowerCase())];

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
