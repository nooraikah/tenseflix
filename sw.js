const CACHE_NAME = 'tenseflix-cache-v1';
const ASSETS = [
    '/',
    'index.html',
    'dashboard.html',
    'profile.html',
    'login.html',
    'lesson.html',
    'home-styles.css',
    'dashboard-styles.css',
    'profile-styles.css',
    'lesson-styles.css',
    'i18n.js',
    'profiles.js',
    'home-script.js',
    'dashboard-script.js',
    'profile-script.js',
    'lesson-script.js',
    'duofilmuo.png',
    'duopinguo.jpg',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});