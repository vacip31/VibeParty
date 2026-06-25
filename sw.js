/* VibeTabu PWA Service Worker (sw.js) */

const CACHE_NAME = 'vibetabu-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/state.js',
    './js/ui.js',
    './js/audio.js',
    './data/words.json',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Service Worker Kurulumu ve Önbellekleme
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Dosyalar önbelleğe alınıyor...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Service Worker Aktivasyonu ve Eski Önbellek Temizliği
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Eski önbellek temizleniyor:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// İstekleri Yakalama ve Önbellekten Sunma (Cache-First)
self.addEventListener('fetch', event => {
    // Sadece GET isteklerini önbelleğe al
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Önbellekte yoksa ağdan çek
                return fetch(event.request).then(response => {
                    // Geçerli bir yanıt aldığımızdan emin olalım
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Yanıtı klonlayıp önbelleğe ekle (Service Worker yanıtı bir kez tüketebilir)
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                }).catch(() => {
                    // Çevrimdışıyken bulunamayan istekler için fallback
                    console.log('SW: İstek çevrimdışı başarısız oldu.');
                });
            })
    );
});
