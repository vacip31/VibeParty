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
    './icon-512.png',
    'https://cdn.tailwindcss.com?plugins=forms,container-queries',
    'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
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
    // Sadece GET isteklerini ve http/https protokollerini yönet
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    // Harici antivirüs veya yerel güvenlik tarayıcı scriptlerini yoksay
    if (event.request.url.includes('kaspersky-labs') || event.request.url.includes('kis.v2.scr')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Önbellekte yoksa ağdan çek
                return fetch(event.request).then(response => {
                    const isSameOrigin = event.request.url.startsWith(self.location.origin);
                    const isGoogleFont = event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com');
                    const isTailwind = event.request.url.includes('cdn.tailwindcss.com');
                    
                    // Sadece kendi kökenimizden veya Google Fonts/Tailwind CDN'den gelen başarılı yanıtları önbelleğe al
                    if (response && response.status === 200 && (isSameOrigin || isGoogleFont || isTailwind)) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }

                    return response;
                }).catch(() => {
                    // Çevrimdışıyken bulunamayan istekler için geçerli bir hata yanıtı döndür (Service Worker null/undefined dönemez)
                    return new Response('Çevrimdışı modda bu kaynağa ulaşılamıyor.', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                    });
                });
            })
    );
});
