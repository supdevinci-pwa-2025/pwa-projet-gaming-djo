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

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gaming-db", 2); // version 1

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("participants")) {
        db.createObjectStore("participants", {
          keyPath: "id",
          autoIncrement: true,
        });
        console.log('📁 Object store "participants" créé');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllPending() {
  try {
    const db = await openDB();
    const transaction = db.transaction(["participants"], "readonly");
    const store = transaction.objectStore("participants");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        // Filtre seulement les participants non synchronisés, qui resteront en cache
        const pendingParticipants = request.result.filter(
          (participant) => !participant.synced
        );
        resolve(pendingParticipants);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("❌ Erreur getAllPending:", error);
    return [];
  }
}

async function savePendingParticipant(participantData) {
  try {
    const db = await openDB();
    const transaction = db.transaction(["participants"], "readwrite");
    const store = transaction.objectStore("participants");

    return new Promise((resolve, reject) => {
      const request = store.add(participantData);
      request.onsuccess = () => {
        console.log(
          "✅ Participant sauvegardé hors ligne:",
          participantData.name
        );
        resolve(request.result);
      };
      request.onerror = () => {
        console.error("❌ Erreur sauvegarde:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("❌ Erreur savePendingParticipants:", error);
    throw error;
  }
}

async function deletePendingParticipant(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction(["participants"], "readwrite");
    const store = transaction.objectStore("participants");

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log("✅ Participant supprimé après sync:", id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("❌ Erreur deletePendingParticipants:", error);
    throw error;
  }
}

async function notifyClients(type, data) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type, data });
    });
  } catch (error) {
    console.error("❌ Erreur notification clients:", error);
  }
}

// ============ INSTALL ==============
self.addEventListener("install", (e) => {
  console.log("Service Worker: Installation");
  e.waitUntil(
    caches.open(staticCacheName).then((cache) => cache.addAll(assets))
  );
  self.skipWaiting();
});

// ============ ACTIVATE ==============
self.addEventListener("activate", (e) => {
  console.log("Service Worker: Activation");
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== staticCacheName).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// ============ FETCH ==============
// self.addEventListener("fetch", (event) => {
//   console.log("🛰 Fetch:", event.request.url);

//   const request = event.request;

//   // Toujours construire un objet URL depuis request.url
//   let url;

//   url = new URL(request.url);

//   console.log("🛰 Interception Fetch:", request.method, url.pathname);

//   event.respondWith(caches.match(request).then((res) => res || fetch(request)));
// });

// ============ HANDLE PARTICIPANT SUBMISSION ==============
async function handleParticipantSubmission(request) {
  console.log("🔥 handleParticipantSubmission appelée");

  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      console.log("✅ Requête en ligne réussie");
      return response;
    }
    throw new Error(`Erreur ${response.status}`);
  } catch (error) {
    console.log("📱 Mode hors ligne détecté, sauvegarde locale...");

    try {
      const formData = await request.formData();
      console.log("📝 FormData récupérée:", {
        name: formData.get("name"),
        role: formData.get("role"),
      });

      const participantData = {
        id: Date.now().toString(),
        name: formData.get("name") || formData.get("participant"),
        role: formData.get("role") || formData.get("status"),
        timestamp: new Date().toISOString(),
        synced: false,
      };

      console.log("💾 Données à sauvegarder:", participantData);

      await savePendingParticipant(participantData);
      console.log("✅ savePendingParticipant terminé");

      if ("sync" in self.registration) {
        await self.registration.sync.register("sync-participants");
        console.log("🔄 Background sync enregistré");
      }

      await notifyClients("participant-saved-offline", participantData);
      console.log("📱 Clients notifiés");

      return new Response(
        JSON.stringify({
          success: true,
          offline: true,
          message: "Participant sauvegardé hors ligne",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (saveError) {
      console.error("❌ Erreur lors de la sauvegarde:", saveError);
      throw saveError;
    }
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method === "POST" &&
    (url.pathname.includes("/api/participant") ||
      url.pathname.includes("/.netlify/functions/participant"))
  ) {
    event.respondWith(handleParticipantSubmission(request));
    return;
  }

  if (request.method !== "GET" || url.origin !== location.origin) return;

  if (url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      caches
        .match("./index.html")
        .then(
          (res) =>
            res || fetch(request).catch(() => caches.match("./offline.html"))
        )
    );
    return;
  }

  if (url.pathname === "/random" || url.pathname === "/random.html") {
    event.respondWith(
      caches
        .match("./random.html")
        .then(
          (res) =>
            res || fetch(request).catch(() => caches.match("./offline.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (res) =>
        res ||
        fetch(request)
          .then((fetchRes) => {
            if (fetchRes.ok) {
              const resClone = fetchRes.clone();
              caches
                .open(staticCacheName)
                .then((cache) => cache.put(request, resClone));
            }
            return fetchRes;
          })
          .catch(() => caches.match("./offline.html"))
    )
  );
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
//  La fonction syncParticipants qui lit IndexedDB et envoie au serveur
// Déjà écrite dans ton code :

// elle utilise getAllPending() pour récupérer les participants,

// les POST au serveur,

// puis supprime de IndexedDB après succès.

// 🔍 Comment tester dans DevTools ?
// Va dans :

// Application > Service Workers
// Clique sur « Sync », et mets ton tag :

// sync-participants
// puis clique sur Trigger.

// Dans la Console, tu dois voir :

// Sync déclenchée pour: sync-participants
// Début de la synchronisation...
// Tentative de synchro pour : ...

/**
 * Fonction asynchrone de synchronisation des participants
 * Cette fonction :
 * - récupère tous les participants stockés localement (dans IndexedDB) qui n'ont pas encore été envoyés au serveur,
 * - les envoie un par un via une requête HTTP POST en JSON à une API serveur,
 * - supprime localement les participants qui ont bien été reçus par le serveur,
 * - notifie les autres onglets/pages ouvertes du succès ou des erreurs,
 * - affiche un rapport de la synchronisation à la fin,
 * - gère proprement les erreurs réseau et serveur.
 */
async function syncParticipants() {
  const pending = await getAllPending();
  console.log(`🔄 Tentative de sync de ${pending.length} participants`);

  for (const participant of pending) {
    try {
      console.log(participant);
      const response = await fetch(
        "https://gmaing.netlify.app/.netlify/functions/participant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: participant.name,
            role: participant.role,
            timestamp: participant.timestamp,
          }),
        }
      );
      console.log("OK MAN");
      console.log(response);
      if (response.ok) {
        await deletePendingParticipant(participant.id);
        await notifyClients("participant-synced", participant);
        console.log("✅ Participant synchronisé:", participant.name);
      } else {
        console.error(`❌ Erreur sync ${participant.name}: ${response.status}`);
      }
    } catch (err) {
      console.error(`❌ Sync failed for ${participant.name}:`, err);
    }
  }
}

// ============ PUSH ==============
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "Participant'n'Track 🍉";
  const options = {
    body: data.body || "Nouvelle notification",
    icon: "./assets/manifest-icon-192.maskable.png",
    badge: "./assets/manifest-icon-192.maskable.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Fonction utilitaire pour déterminer dynamiquement l'URL de l'API en fonction de l'environnement
 * ----------------------------------------------------------------------------------------------
 * Utilise l'objet URL et self.location.href pour récupérer l'URL complète de la page courante
 * Puis analyse le hostname pour retourner :
 * - une URL locale pour localhost/127.0.0.1,
 * - une URL adaptée pour Netlify (fonctions serverless),
 * - une URL de production par défaut.
 */
function getApiUrl() {
  // Création d'un objet URL pour analyser proprement l'URL courante
  const currentUrl = new URL(self.location.href);
  // Si on est en local (dev sur machine locale)
  if (
    currentUrl.hostname === "localhost" ||
    currentUrl.hostname === "127.0.0.1"
  ) {
    // Retourne l'URL locale pour l'API, sur le même port que le front-end
    return `${currentUrl.origin}/api/participant`;
  }
  // Si on est déployé sur Netlify (URL contenant "netlify.app")
  if (currentUrl.hostname.includes("netlify.app")) {
    // Retourne l'URL de la fonction serverless hébergée sur Netlify
    console.log(currentUrl.origin + "GUIFSGFIU");
    return `${currentUrl.origin}/.netlify/functions/participant`;
  }
  // Sinon on retourne une URL de production fixe (exemple : site Netlify principal)
  return "https://gmaing.netlify.app/.netlify/functions/participant";
}
