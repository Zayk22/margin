const CACHE_NAME = "margin-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  "/",
  "/history",
  "/budgets",
  "/settings",
  "/manifest.webmanifest",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Handle API requests: Network first, fallback to nothing (let the app handle the error)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Handle static assets (JS, CSS, Fonts, Images): Cache first
  if (
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Handle navigation (HTML): Network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the latest version
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          return response || caches.match(OFFLINE_URL);
        });
      })
  );
});