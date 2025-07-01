// Écouter l'installation du SW
self.addEventListener("install", function (event) {
  console.log("Service Worker installé");
  self.skipWaiting(); // Prendre le contrôle immédiatement
});

// Écouter l'activation du SW
self.addEventListener("activate", function (event) {
  console.log("Service Worker activé");
  self.clients.claim(); // Prendre le contrôle des pages ouvertes
});

const staticCacheName = "my-gaming-site-cache-v1";
const assets = [
  "./",
  "./index.html",
  "./offline.html",
  "./random.html",
  "./open.html",
  "./share.html",
  "./style.css",
  "./app.js",
  "./serviceWorker.js",
  "./manifest.json",
  "./assets/manifest-icon-192.maskable.png",
  "./assets/manifest-icon-512.maskable.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      console.log("Opened cache");
      return cache.addAll(assets);
    })
  );
});

self.addEventListener("activate", function (event) {
  const cacheWhitelist = [staticCacheName];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => !cacheWhitelist.includes(k))
          .map((k) => caches.delete(k))
      );
    })
  );
});

// Intercepter les requêtes pour servir depuis le cache
self.addEventListener("fetch", (event) => {
  console.log("🛰 Fetch:", event.request.url);

  const request = event.request;
  const url = new URL(request.url);

  console.log("🛰 Interception Fetch:", request.method, url.pathname);

  // if(request.method === "POST" && url.pathname.includes('api/snack')) {
  //   event.respondWith
  // }

  event.respondWith(
    // indice: permet de renvoyer une réponse custom
    caches
      .match(event.request) // cherche dans le cache
      .then((res) => res || fetch(event.request)) // si pas trouvé, va le chercher en ligne
  );
});
