const CACHE_NAME = 'makik-fact-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/auth.js',
    '/config.js',
    '/punto-venta.html',
    '/punto-venta.js',
    '/ventas.html',
    '/ventas.js',
    '/clientes.html',
    '/clientes.js',
    '/login.html',
    '/login.js',
    '/info.html',
    '/info.js'
];

// Instalar Service Worker y cachear recursos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activar el SW y limpiar caches antiguos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Estrategia: Network First, falling back to cache
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});