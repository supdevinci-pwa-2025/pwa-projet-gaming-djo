import { syncParticipants } from "./app";

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

self.addEventListener("fetch", (event) => {
  console.log("🛰 Fetch:", event.request.url);

  const request = event.request;

  // Toujours construire un objet URL depuis request.url
  let url;

  url = new URL(request.url);

  console.log("🛰 Interception Fetch:", request.method, url.pathname);

  event.respondWith(caches.match(request).then((res) => res || fetch(request)));
});

// Écouter cet événement dans le SW (serviceWorker.js)
// Ton service worker sera réveillé même si la page est fermée, et fera la sync.

//  Code à trous (dans serviceWorker.js)

self.addEventListener("sync", (event) => {
  console.log("📡 Sync déclenchée pour:", event.tag);
  if (event.tag === "sync-participants") {
    // indice: le même tag que plus haut
    event.waitUntil(syncParticipants()); // indice: dire "attends la fin de cette promesse"
  }
});
//  La fonction syncSnacks qui lit IndexedDB et envoie au serveur
// Déjà écrite dans ton code :

// elle utilise getAllPending() pour récupérer les snacks,

// les POST au serveur,

// puis supprime de IndexedDB après succès.

// 🔍 Comment tester dans DevTools ?
// Va dans :

// Application > Service Workers
// Clique sur « Sync », et mets ton tag :

// sync-snacks
// puis clique sur Trigger.

// Dans la Console, tu dois voir :

// Sync déclenchée pour: sync-snacks
// Début de la synchronisation...
// Tentative de synchro pour : ...
