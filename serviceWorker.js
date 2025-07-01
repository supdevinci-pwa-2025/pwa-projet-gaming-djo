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

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gaming-db", 1); // version 1

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pending-gaming")) {
        db.createObjectStore("pending-gaming", {
          keyPath: "id",
          autoIncrement: true,
        });
        console.log('📁 Object store "pending-gaming" créé');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllPending() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pending-gaming", "readonly");
      const store = tx.objectStore("pending-gaming");
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

/**
 * Fonction asynchrone de synchronisation des snacks
 * Cette fonction :
 * - récupère tous les snacks stockés localement (dans IndexedDB) qui n'ont pas encore été envoyés au serveur,
 * - les envoie un par un via une requête HTTP POST en JSON à une API serveur,
 * - supprime localement les snacks qui ont bien été reçus par le serveur,
 * - notifie les autres onglets/pages ouvertes du succès ou des erreurs,
 * - affiche un rapport de la synchronisation à la fin,
 * - gère proprement les erreurs réseau et serveur.
 */
async function syncParticipants() {
  // Log dans la console pour indiquer le début de la synchronisation
  console.log("🔄 Début de la synchronisation...");

  try {
    // 1️⃣ Récupération des snacks en attente dans IndexedDB (base locale du navigateur)
    // getAllPending() est une fonction asynchrone qui retourne un tableau de snacks non synchronisés
    const pending = await getAllPending();
    console.log(`📊 ${pending.length} participants(s) à synchroniser`);

    // Si aucun snack à synchroniser, on sort directement de la fonction (pas besoin de faire plus)
    if (pending.length === 0) {
      console.log("✅ Aucun participant en attente");
      return; // Fin de la fonction ici
    }

    // 2️⃣ Initialisation de compteurs pour suivre succès/échecs
    let success = 0,
      fail = 0;
    // Tableau pour garder les snacks qui n'ont pas pu être synchronisés, avec détail de l'erreur
    const failedParticipants = [];

    // 3️⃣ Boucle asynchrone pour traiter chaque snack un par un
    for (const participant of pending) {
      try {
        console.log("🚀 Tentative de synchro pour :", participant.name);

        // Récupération de l'URL de l'API via une fonction dédiée pour gérer différents environnements (local, prod...)
        const apiUrl = getApiUrl();
        console.log("🌐 URL API utilisée:", apiUrl);

        // Envoi de la requête HTTP POST vers l'API
        // fetch() est une API JavaScript moderne pour faire des requêtes HTTP asynchrones
        // Ici on envoie les données au format JSON (headers et body)
        const response = await fetch(apiUrl, {
          method: "POST", // Méthode HTTP POST pour envoyer des données
          headers: {
            // En-têtes HTTP pour indiquer le type de contenu
            "Content-Type": "application/json", // Le corps de la requête est en JSON
            Accept: "application/json", // On attend une réponse en JSON
          },
          body: JSON.stringify({
            // Conversion des données JavaScript en chaîne JSON
            name: participant.name, // Propriété 'name' du snack
            role: participant.role, // Propriété 'mood' du snack (ex: humeur)
            timestamp: snack.timestamp, // Date/heure de création ou modification
          }),
        });

        // Log du statut HTTP reçu : status est un entier (ex: 200), statusText est une description (ex: OK)
        console.log(
          "📊 Réponse serveur:",
          response.status,
          response.statusText
        );

        if (response.ok) {
          // Si le serveur répond avec un code HTTP 2xx (succès), on considère la synchro réussie
          console.log("✅ Snack synchronisé :", participant.name);

          // Suppression du snack de IndexedDB pour éviter les doublons à l'avenir
          // deletePendingSnack() est une fonction asynchrone qui supprime par identifiant
          await deletePendingSnack(participant.id);

          // Notification aux autres onglets/pages que ce snack a été synchronisé
          // Utile pour mettre à jour l'affichage en temps réel dans plusieurs fenêtres
          await notifyClients("snack-synced", { participant });

          success++; // Incrémentation du compteur de succès
        } else {
          // Si la réponse HTTP est autre que 2xx (ex: erreur 404, 500)
          // On tente de lire le corps de la réponse pour récupérer un message d'erreur
          const errorText = await response
            .text()
            .catch(() => "Erreur inconnue");

          // Log détaillé de l'erreur serveur
          console.error(
            `❌ Erreur serveur ${response.status} pour : ${participant.name}`,
            errorText
          );

          // On ajoute ce snack à la liste des snacks ayant échoué la synchro, avec le message d'erreur
          failedParticipants.push({
            snack: participant.name,
            error: `${response.status}: ${errorText}`,
          });

          fail++; // Incrémentation du compteur d'échecs
        }
      } catch (err) {
        // Gestion des erreurs liées au réseau (ex: pas d'accès Internet, timeout)
        console.error(
          `❌ Erreur réseau pour : ${participant.name}`,
          err.message
        );

        // On garde aussi trace de ces erreurs dans le tableau des échecs
        failedParticipants.push({
          participant: participant.name,
          error: err.message,
        });

        fail++; // Incrémentation du compteur d'échecs
      }
    }

    // 4️⃣ Après traitement de tous les snacks, on affiche un bilan clair
    console.log(`📈 Sync terminée : ${success} succès / ${fail} échecs`);

    // Si certains snacks n'ont pas pu être synchronisés, on affiche la liste avec erreurs
    if (failedParticipants.length > 0) {
      console.log("❌ Snacks échoués:", failedParticipants);
    }

    // Notification générale aux autres onglets/pages que la synchronisation est terminée
    // On transmet le nombre de succès, d'erreurs, et les détails des échecs
    await notifyClients("sync-completed", {
      success,
      errors: fail,
      failedParticipants: failedParticipants,
    });
  } catch (e) {
    // Gestion d'erreurs globales pouvant survenir dans tout le bloc try (ex: erreur IndexedDB)
    console.error("💥 Erreur globale dans syncParticipants :", e);

    // Notification des autres onglets/pages qu'il y a eu une erreur globale
    await notifyClients("sync-error", { error: e.message });

    // Relance de l'erreur pour que le code qui a appelé syncParticipants puisse aussi la gérer
    throw e;
  }
}

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
    return `${currentUrl.origin}/api/gaming`;
  }
  // Si on est déployé sur Netlify (URL contenant "netlify.app")
  if (currentUrl.hostname.includes("netlify.app")) {
    // Retourne l'URL de la fonction serverless hébergée sur Netlify
    return `${currentUrl.origin}/.netlify/functions/gaming`;
  }
  // Sinon on retourne une URL de production fixe (exemple : site Netlify principal)
  return "https://gmaing.netlify.app/.netlify/functions/gaming";
}
