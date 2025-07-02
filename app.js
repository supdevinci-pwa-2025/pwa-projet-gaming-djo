// app.js - Version corrigée pour IndexedDB
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/serviceWorker.js")
    .then((reg) => console.log("✅ SW enregistré", reg))
    .catch((err) => console.error("❌ SW non enregistré:", err));
}

const participantsList = document.querySelector("#participant-list");
let participants = [];

// Charger les participants au démarrage
document.addEventListener("DOMContentLoaded", async () => {
  await loadParticipants();
  setupForm();
  setupServiceWorkerListener();
});

// ============ GESTION DU FORMULAIRE ============
function setupForm() {
  const form = document.querySelector("#participant-form");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.querySelector("#participant-name").value.trim();
    const role = document.querySelector("#participant-role").value.trim();

    if (!name || !role) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    console.log("📝 Envoi du participant:", { name, role });

    try {
      // Créer FormData pour l'envoi
      const formData = new FormData();
      formData.append("name", name);
      formData.append("role", role);

      // Envoyer vers l'API (intercepté par le SW si hors ligne)
      const response = await fetch("/api/participant", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("✅ Réponse:", result);

      if (result.offline) {
        showMessage("📱 Participant sauvegardé hors ligne !", "warning");
      } else {
        showMessage("✅ Participant ajouté avec succès !", "success");
        // Ajouter à la liste locale immédiatement
        addParticipantToUI(name, role);
      }

      form.reset();
    } catch (error) {
      console.error("❌ Erreur soumission:", error);
      showMessage("❌ Erreur lors de l'ajout", "error");
    }
  });
}

// ============ ÉCOUTER LES MESSAGES DU SERVICE WORKER ============
function setupServiceWorkerListener() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const { type, data } = event.data;

      console.log("📱 Message du SW:", type, data);

      switch (type) {
        case "participant-saved-offline":
          console.log("📱 Participant sauvegardé hors ligne:", data);
          addParticipantToUI(data.name, data.role);
          showMessage(`📱 ${data.name} sauvegardé hors ligne`, "warning");
          break;

        case "participant-synced":
          console.log("🔄 Participant synchronisé:", data);
          showMessage(`🔄 ${data.name} synchronisé !`, "success");
          break;
      }
    });
  }
}

// ============ CHARGEMENT DES PARTICIPANTS ============
async function loadParticipants() {
  try {
    // Essayer de charger depuis l'API
    const response = await fetch(
      "https://gmaing.netlify.app//.netlify/functions/get-participants"
    );

    if (response.ok) {
      const data = await response.json();
      participants = data.participants || [];
      console.log("✅ Participants chargés depuis l'API:", participants.length);
    } else {
      throw new Error("API non disponible");
    }
  } catch (error) {
    console.log("📱 API non disponible, chargement depuis localStorage");
    // Fallback sur localStorage
    participants = JSON.parse(localStorage.getItem("participants")) || [];
  }

  // Afficher les participants
  participants.forEach((participant) =>
    addParticipantToUI(participant.name, participant.role)
  );
}
/*
function addPerson() {
  const nameInput = document.getElementById("personName");
  const roleInput = document.getElementById("personRole");
  const name = nameInput.value.trim();
  const role = roleInput.value;

  if (name === "") {
    alert("Veuillez entrer un nom.");
    return;
  }

  const newPerson = { name, role };
  people.push(newPerson);
  localStorage.setItem("gamingData", JSON.stringify(people));
  nameInput.value = "";
  displayPeople();
}

let people = JSON.parse(localStorage.getItem("gamingData")) || [];

function displayPeople() {
  const list = document.getElementById("peopleList");
  list.innerHTML = "";

  let count = { total: 0, "En attente": 0, Qualifié: 0, Éliminé: 0 };

  people.forEach(({ name, role }, index) => {
    const div = document.createElement("div");
    div.className = "person";
    div.innerHTML = `<span>${name} – ${role}</span><button onclick="removePerson(${index})">❌</button>`;
    list.appendChild(div);
    count.total++;
    count[role]++;
  });

  document.getElementById("total").textContent = count.total;
  document.getElementById("en attente").textContent = count["En attente"];
  document.getElementById("qualifié").textContent = count["Qualifié"];
  document.getElementById("éliminé").textContent = count["Éliminé"];
}

function removePerson(index) {
  people.splice(index, 1);
  localStorage.setItem("gamingData", JSON.stringify(people));
  displayPeople();
}

displayPeople();
*/
// ============ AFFICHAGE UI ============
function addParticipantToUI(name, role) {
  const li = document.createElement("li");
  li.textContent = `🍪 ${name} (${role})`;
  li.className = "participant-item";
  participantsList.appendChild(li);
}

function showMessage(message, type = "info") {
  // Créer un élément de notification
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Styles basiques
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    ${type === "success" ? "background: #4CAF50;" : ""}
    ${type === "warning" ? "background: #FF9800;" : ""}
    ${type === "error" ? "background: #f44336;" : ""}
  `;

  document.body.appendChild(notification);

  // Supprimer après 3 secondes
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ============ BOUTON TEST SYNC ============
document.addEventListener("DOMContentLoaded", () => {
  const syncButton = document.querySelector('[data-action="sync"]');

  syncButton?.addEventListener("click", async () => {
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register("sync-participants");
        console.log("🔄 Background sync déclenché manuellement");
        showMessage("🔄 Synchronisation déclenchée", "info");
      } catch (error) {
        console.error("❌ Erreur sync:", error);
        showMessage("❌ Erreur de synchronisation", "error");
      }
    } else {
      showMessage("❌ Background Sync non supporté", "error");
    }
  });
});

// ============ SAUVEGARDE DE SECOURS ============
// Sauvegarder périodiquement dans localStorage comme backup
function backupToLocalStorage() {
  localStorage.setItem("participants", JSON.stringify(participants));
}

// Sauvegarder toutes les 30 secondes
setInterval(backupToLocalStorage, 30000);

// Étapes pour le BACKGROUND SYNC
// Enregistrer une tâche de synchronisation depuis la page (app.js)
// Après avoir enregistré ton service worker, tu peux dire :

// « Dès que possible, déclenche un background sync avec le tag sync-participants ».

// Code à trous (dans app.js)
/*
navigator.serviceWorker.ready.then((reg) => {
  console.log("YEP");
  reg.sync
    .register("syncParticipants") // indice: méthode pour enregistrer une sync
    .then(() => console.log("📡 Sync enregistrée"))
    .catch((err) => console.error("❌ Erreur sync:", err));
});
*/
