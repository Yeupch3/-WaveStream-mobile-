const CACHE_NAME = 'wavestream-v2.0.0';
const CACHE_URLS = [
  '/',
  '/index.html',
  'https://vjs.zencdn.net/8.6.1/video.min.js',
  'https://vjs.zencdn.net/8.6.1/video-js.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Installation
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Mise en cache des ressources');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activation');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  // Ignorer les requêtes M3U (flux vidéo)
  if (event.request.url.includes('.m3u') || event.request.url.includes('.m3u8')) {
    return fetch(event.request);
  }
  
  // Ignorer les flux vidéo HTTP
  if (event.request.url.startsWith('http') && 
      (event.request.url.includes('/live/') || 
       event.request.url.includes('/stream/') ||
       event.request.url.includes('m3u8'))) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourner du cache si disponible
        if (response) {
          return response;
        }
        
        // Sinon, récupérer depuis le réseau
        return fetch(event.request).then(response => {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Mettre en cache pour la prochaine fois
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // Fallback pour les pages
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        
        // Fallback pour les images
        if (event.request.destination === 'image') {
          return new Response(
            '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#333"/><text x="50" y="50" font-family="Arial" font-size="14" fill="#fff" text-anchor="middle" dy=".3em">No Image</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      })
  );
});

// Message handler
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-playlists') {
    event.waitUntil(syncPlaylists());
  }
});

async function syncPlaylists() {
  console.log('[Service Worker] Synchronisation des playlists');
  // Implémentation de la synchronisation
}