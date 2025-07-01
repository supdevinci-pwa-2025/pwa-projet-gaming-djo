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

function getAllPending() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pending-science", "readonly");
      const store = tx.objectStore("pending-science");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

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

async function syncParticipants() {
  console.log(" Début de la synchronisation...");

  // 1️⃣ Lire la liste des participants en attente
  const pending = await getAllPending(); // indice: fonction qui lit IndexedDB
  console.log(pending);
  console.log(`${pending.length} participant(s) à synchroniser`);

  let success = 0;
  let fail = 0;

  // 2️⃣ Boucle principale
  for (const participant of pending) {
    try {
      console.log(`🚀 Envoi de ${participant.name}`); // indice: propriété du participant à afficher

      const response = await fetch("/api/sync-participants", {
        // indice: URL de votre API
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: participant.name, // indice: nom du participant
          email: participant.role, // indice: email ou autre champ
          timestamp: participant.timestamp, // indice: date ou identifiant temporel
        }),
      });

      if (response.ok) {
        console.log(`✅ Participant synchronisé : ${participant.name}`);

        await removePerson(participant.id); // indice: supprime de IndexedDB
        await postMessage("participant-synced", { participant }); // indice: notifie les clients
        success++;
      } else {
        console.error(
          `❌ Erreur serveur ${response.status} pour ${participant.name}`
        );
        fail++;
      }
    } catch (err) {
      console.error(
        `❌ Erreur réseau pour ${participant.name}: ${err.message}`
      );
      fail++;
    }
  }

  // 3️⃣ Bilan final
  console.log(` ${success} participants synchronisés, ❌ ${fail} échecs`);
}

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
