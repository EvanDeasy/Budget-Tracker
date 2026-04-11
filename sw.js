// Budget Tracker — Service Worker
// Handles offline caching so the app works without a network connection.

const CACHE_NAME = 'budget-tracker-v3';

// Core files to pre-cache on install
const PRECACHE_URLS = [
    './',
    './Budget_V4.html',
    './manifest.json'
];

// ── Install: pre-cache app shell ──────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(PRECACHE_URLS);
        }).catch(err => console.warn('Pre-cache partial failure:', err))
    );
    self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch: cache-first for app shell, network-first for CDN ──
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always use cache-first for same-origin requests (the HTML file itself)
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Network-first for CDN resources (Chart.js, Tailwind, Google Fonts)
    // Falls back to cache if offline
    if (
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdn.tailwindcss.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')
    ) {
        event.respondWith(
            fetch(event.request).then(response => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => caches.match(event.request))
        );
    }
});
