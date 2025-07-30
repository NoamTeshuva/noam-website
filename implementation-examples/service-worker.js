// Service Worker for Bloomberg Terminal
// Handles caching of static assets and API responses

const CACHE_NAME = 'bloomberg-terminal-v1';
const STATIC_CACHE = 'bloomberg-static-v1';
const API_CACHE = 'bloomberg-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/bloomberg',
  '/login',
  '/manifest.json'
];

// API endpoints that can be cached
const CACHEABLE_APIS = [
  'https://finnhub.io/api/v1/stock/profile2',
  'https://www.alphavantage.co/query?function=OVERVIEW',
  'https://www.alphavantage.co/query?function=SYMBOL_SEARCH'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔧 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticAsset(url)) {
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    } else if (isCacheableAPI(url)) {
      event.respondWith(staleWhileRevalidateStrategy(request, API_CACHE));
    } else if (isRealTimeAPI(url)) {
      event.respondWith(networkOnlyStrategy(request));
    } else {
      event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
    }
  }
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate strategy for API data
async function staleWhileRevalidateStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Fetch from network in background
    const networkResponsePromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });
    
    // Return cached version immediately if available
    return cachedResponse || networkResponsePromise;
  } catch (error) {
    console.error('Stale-while-revalidate strategy failed:', error);
    return fetch(request);
  }
}

// Network-only strategy for real-time data
async function networkOnlyStrategy(request) {
  return fetch(request);
}

// Network-first strategy with cache fallback
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.startsWith('/static/') || 
         url.pathname.endsWith('.js') || 
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.svg');
}

function isCacheableAPI(url) {
  return CACHEABLE_APIS.some(api => url.href.startsWith(api));
}

function isRealTimeAPI(url) {
  return url.href.includes('quote') || 
         url.href.includes('realtime') ||
         url.protocol === 'wss:';
}

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-quotes') {
    event.waitUntil(syncQuotes());
  }
});

async function syncQuotes() {
  console.log('🔄 Background syncing quotes...');
  // Implement background sync logic here
}