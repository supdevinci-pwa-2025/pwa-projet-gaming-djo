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
    caches.match(event.request).then(function (response) {
      // Si trouvé dans le cache, on renvoie la version en cache
      if (response) {
        return response;
      }

      // Sinon, on tente le réseau
      return fetch(event.request)
        .then(function (networkResponse) {
          // Vérifie que la réponse est correcte
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // Clone la réponse
          const responseToCache = networkResponse.clone();

          // Met en cache la ressource
          caches.open(staticCacheName).then(function (cache) {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(function (error) {
          console.error("Fetch failed; returning offline fallback:", error);

          // Ici tu peux retourner une page HTML de secours si c'est une requête navigation
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }

          // Sinon, on peut retourner rien (ça provoque une erreur dans le navigateur)
          return new Response(
            "Vous êtes hors ligne et la ressource n'est pas en cache.",
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: new Headers({ "Content-Type": "text/plain" }),
            }
          );
        });
    })
  );
});
