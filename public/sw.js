// Service worker do PWA: o jogo abre sem internet depois da primeira visita (src/ui/preload.ts
// guarda o código e os arquivos logo que o jogo abre). As páginas e a lista de arquivos vêm da rede
// quando possível, para pegar versões novas; o código com hash e os sprites, sons e mapas vêm do cache.

const CACHE = 'pokeidle-v1';
const CORE = ['./', './index.html', './ajuda.html', './manifest.webmanifest', './icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const opts = { ignoreVary: true };
    return (
      (await cache.match(request, opts)) ??
      (await cache.match(request.url.includes('ajuda') ? './ajuda.html' : './index.html', opts)) ??
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  // ignoreVary: módulos são pedidos com outros cabeçalhos que o pré-carregador; com `Vary: Origin`, não seriam achados.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const fresh = request.mode === 'navigate' || url.pathname.endsWith('/asset-manifest.json');
  event.respondWith(fresh ? networkFirst(request) : cacheFirst(request));
});
