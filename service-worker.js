const CACHE_NAME = 'tribute-profile-v23';
const ASSETS_TO_CACHE = ['./', './index.html', './style.css', './firebase-setup.js', './player.js', './admin.js', './app.js', './devtools.js', './cards.js', './pix.js', './manifest.json', './icon-192.png', './icon-512.png', './video.mp4'];
const IS_LOCAL_WORKER = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'].includes(self.location.hostname);

self.addEventListener('install', (event) => {
  if (IS_LOCAL_WORKER) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  // REMOVIDO o self.skipWaiting() daqui para o worker ficar em estágio 'waiting'
  // até o usuário clicar no botão do modal de atualização
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Deleta o cache antigo da rodada de 10 dicas
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Ouve o comando vindo do app.js para aplicar a nova versão
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL_WORKER) return;
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('gstatic.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Ouve o comando vindo do app.js para aplicar a nova versão
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('gstatic.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }),
  );
});
