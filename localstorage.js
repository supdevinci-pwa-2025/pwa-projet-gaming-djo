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

// self.addEventListener("fetch", function (event) {
//   event.respondWith(
//     caches.match(event.request).then(function (response) {
//       if (response) {
//         return response;
//       }

//       return fetch(event.request)
//         .then(function (networkResponse) {
//           if (
//             !networkResponse ||
//             networkResponse.status !== 200 ||
//             networkResponse.type !== "basic"
//           ) {
//             return networkResponse;
//           }

//           const responseToCache = networkResponse.clone();
//           caches.open(staticCacheName).then(function (cache) {
//             cache.put(event.request, responseToCache);
//           });

//           return networkResponse;
//         })
//         .catch(function (error) {
//           console.error("Fetch failed; returning offline fallback:", error);
//           if (event.request.mode === "navigate") {
//             return caches.match("./offline.html");
//           }

//           return new Response(
//             "Vous êtes hors ligne et la ressource n'est pas en cache.",
//             {
//               status: 503,
//               statusText: "Service Unavailable",
//               headers: new Headers({ "Content-Type": "text/plain" }),
//             }
//           );
//         });
//     })
//   );
// });

// Intercepter les requêtes pour servir depuis le cache
self.addEventListener("fetch", (event) => {
  console.log("🛰 Fetch:", event.request.url);

  event.respondWith(
    // indice: permet de renvoyer une réponse custom
    caches
      .match(event.request) // cherche dans le cache
      .then((res) => res || fetch(event.request)) // si pas trouvé, va le chercher en ligne
  );
});
