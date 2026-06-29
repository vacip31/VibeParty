/* VibeParty PWA Service Worker (sw.js) */

const CACHE_NAME = 'vibeparty-cache-v34';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './css/fonts.css',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './js/hub.js',
    // Yerelleştirilmiş Font Dosyaları
    './fonts/courierprime_0.woff',
    './fonts/courierprime_1.woff',
    './fonts/inter_0.woff',
    './fonts/inter_1.woff',
    './fonts/inter_2.woff',
    './fonts/inter_3.woff',
    './fonts/inter_4.woff',
    './fonts/inter_5.woff',
    './fonts/inter_6.woff',
    './fonts/materialsymbols_0.woff',
    './fonts/playfairdisplay_0.woff',
    './fonts/playfairdisplay_1.woff',
    './fonts/playfairdisplay_2.woff',
    './fonts/playfairdisplay_3.woff',
    './fonts/playfairdisplay_4.woff',
    './fonts/playfairdisplay_5.woff',
    './fonts/playfairdisplay_6.woff',
    './fonts/playfairdisplay_7.woff',
    // VibeTabu Dosyaları
    './games/taboo/index.html',
    './games/taboo/js/app.js',
    './games/taboo/js/state.js',
    './games/taboo/js/ui.js',
    './games/taboo/js/audio.js',
    './games/taboo/data/words.json',
    './games/taboo/icon-192.png',
    './games/taboo/icon-512.png',
    // Vibe X Verses Dosyaları
    './games/verses/index.html',
    './games/verses/js/app.js',
    './games/verses/js/state.js',
    './games/verses/js/ui.js',
    './games/verses/js/audio.js',
    './games/verses/data/categories.json'
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
