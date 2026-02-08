/**
 * SecureVault Service Worker
 * Provides offline support and caching
 */

const CACHE_NAME = 'securevault-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
];

// Install - Cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).catch((err) => {
            console.error('[SW] Failed to cache static assets:', err);
        })
    );
    
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    
    // Take control of all clients
    self.clients.claim();
});

// Fetch - Cache strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip API requests (don't cache sensitive data)
    if (url.pathname.startsWith('/api/')) {
        return;
    }
    
    // Strategy: Cache First for static assets
    if (isStaticAsset(request)) {
        event.respondWith(
            caches.match(request).then((response) => {
                if (response) {
                    // Return cached version
                    return response;
                }
                
                // Fetch and cache
                return fetch(request).then((fetchResponse) => {
                    if (fetchResponse.ok) {
                        const clone = fetchResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return fetchResponse;
                });
            })
        );
    }
    
    // Strategy: Network First for HTML pages
    if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache the HTML for offline use
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached version if network fails
                    return caches.match(request).then((cached) => {
                        if (cached) {
                            return cached;
                        }
                        // Return offline page if available
                        return caches.match('/offline.html');
                    });
                })
        );
    }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-vault-changes') {
        event.waitUntil(syncVaultChanges());
    }
});

// Push notifications (for security alerts)
self.addEventListener('push', (event) => {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: data.tag || 'securevault',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
    };
    
    event.waitUntil(
        self.registration.showNotification('SecureVault', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            if (clientList.length > 0) {
                clientList[0].focus();
            } else {
                clients.openWindow('/');
            }
        })
    );
});

// Message handling from main app
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Helper functions
function isStaticAsset(request) {
    const staticExtensions = [
        '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
        '.woff', '.woff2', '.ttf', '.eot', '.ico'
    ];
    return staticExtensions.some((ext) => request.url.endsWith(ext));
}

async function syncVaultChanges() {
    // Retrieve pending changes from IndexedDB
    // This would be implemented with the actual sync logic
    console.log('[SW] Syncing vault changes...');
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
    self.registration.periodicSync.register('vault-sync', {
        minInterval: 24 * 60 * 60 * 1000, // Once per day
    }).catch((err) => {
        console.log('[SW] Periodic sync registration failed:', err);
    });
}

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'vault-sync') {
        event.waitUntil(syncVaultChanges());
    }
});
