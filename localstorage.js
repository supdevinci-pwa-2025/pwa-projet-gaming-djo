const staticCacheName = "my-gaming-site-cache-v1";
const assets = [
  "./",
  "./index.html",
  "./random.html",
  "./open.html",
  "./share.html",
  "./style.css",
  "./app.js",
  "./serviceWorker.js",
  "./netlify/functions/share.js",
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
        keys.filter((k) => k !== staticCacheName).map((k) => caches.delete(k))
      );
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches
      .match(event.request)
      .then(function (response) {
        // Si trouvé dans le cache, on renvoie la version en cache
        if (response) {
          return response;
        }

        // Sinon, on va le chercher sur le réseau
        return fetch(event.request).then(function (networkResponse) {
          // Vérifie qu'on a une réponse valide
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // Clone la réponse car elle est un flux qui ne peut être consommé qu'une fois
          const responseToCache = networkResponse.clone();

          caches.open("my-site-cache-v1").then(function (cache) {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
      .catch(function (error) {
        console.error("Fetch failed:", error);
        // Tu peux retourner ici une page d'erreur ou rien
      })
  );
});
