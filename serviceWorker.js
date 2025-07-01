var CACHE_NAME = "my-site-cache-v1";
var urlsToCache = ["/", "/styles/main.[hash].css", "/script/main.[hash].js"];

// <!-- Écouter l'installation du SW -->
self.addEventListener("install", function (event) {
  // indice: quand le SW est installé
  console.log(" Service Worker installé");
  self.skipWaiting(); // indice: forcer à prendre le contrôle immédiatement

  // Perform install steps
  // event.waitUntil(
  //   caches.open(CACHE_NAME).then(function (cache) {
  //     console.log("Opened cache");
  //     return cache.addAll(urlsToCache);
  //   })
  // );
});

// <!-- Écouter l'activation du SW -->
self.addEventListener("activate", function (event) {
  var cacheWhitelist = [CACHE_NAME];

  // indice: quand le SW devient actif
  console.log(" Service Worker activé");
  self.clients.claim(); // indice: prendre le contrôle des pages ouvertes

  // event.waitUntil(
  //   // Check de toutes les clés de cache.
  //   caches.keys().then(function (cacheNames) {
  //     return Promise.all(
  //       cacheNames.map(function (cacheName) {
  //         if (cacheWhitelist.indexOf(cacheName) === -1) {
  //           return caches.delete(cacheName);
  //         }
  //       })
  //     );
  //   })
  // );
});
