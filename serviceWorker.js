// var CACHE_NAME = "my-site-cache-v1";
// var urlsToCache = ["/", "/styles/main.[hash].css", "/script/main.[hash].js"];

// self.addEventListener("install", function (event) {
//   // Perform install steps
//   event.waitUntil(
//     caches.open(CACHE_NAME).then(function (cache) {
//       console.log("Opened cache");
//       return cache.addAll(urlsToCache);
//     })
//   );
// });

// self.addEventListener("activate", function (event) {
//   var cacheWhitelist = [CACHE_NAME];

//   event.waitUntil(
//     // Check de toutes les clés de cache.
//     caches.keys().then(function (cacheNames) {
//       return Promise.all(
//         cacheNames.map(function (cacheName) {
//           if (cacheWhitelist.indexOf(cacheName) === -1) {
//             return caches.delete(cacheName);
//           }
//         })
//       );
//     })
//   );
// });
