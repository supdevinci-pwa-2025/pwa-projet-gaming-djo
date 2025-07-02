// app.js - Version adaptée avec sélecteur de rôle personnalisé
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/serviceWorker.js")
    .then((reg) => console.log("✅ SW enregistré", reg))
    .catch((err) => console.error("❌ SW non enregistré:", err));
}

const participantsList = document.querySelector("#participant-list");
const csvParticipantsList = document.querySelector("#participants");
let participants = [];

// Charger les participants au démarrage
document.addEventListener("DOMContentLoaded", async () => {
  await loadParticipants();
  setupForm();
  setupServiceWorkerListener();
  setupFileUpload();
  setupTestButton();

  // Gestion du routing /open
  if (location.pathname === "/open") {
    showMessage("🗂️ Tu as ouvert un fichier CSV !", "info");
  }
});

// ============ GESTION DU FORMULAIRE ============
function setupForm() {
  const form = document.querySelector("#participant-form");

  // Créer le sélecteur de rôle personnalisé
  createCustomRoleSelector();

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = document.querySelector("#participant-name");
    const roleSelector = document.querySelector(".role-selector");

    const name = nameInput?.value.trim();
    const role = roleSelector?.dataset.selectedRole || "en-attente";

    if (!name) {
      showMessage("⚠️ Veuillez entrer un nom de participant", "warning");
      return;
    }

    // Vérifier les doublons
    if (participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      showMessage("🚫 Ce participant existe déjà !", "error");
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

      let result = {};
      let text = await response.text();

      try {
        result = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("❌ Erreur parsing JSON:", e);
        result = {};
      }

      console.log("✅ Réponse:", result);

      if (result.offline) {
        showMessage("📱 Participant sauvegardé hors ligne !", "warning");
        addParticipantToUI(name, role);
      } else {
        showMessage("✅ Participant ajouté avec succès !", "success");
        // Ajouter à la liste locale immédiatement
        addParticipantToUI(name, role);

        participants.push({
          id: Date.now(),
          name,
          role,
        });
        backupToLocalStorage();
      }

      form.reset();
      resetRoleSelector();
    } catch (error) {
      console.error("❌ Erreur soumission:", error);

      // Mode fallback hors ligne
      //   participants.push({
      //     id: Date.now(),
      //     name,
      //     role,
      //     offline: true,
      //   });
      //   backupToLocalStorage();
      addParticipantToUI(name, role);

      showMessage("📱 Sauvegardé hors ligne", "warning");

      form.reset();
      resetRoleSelector();
    }
  });
}

// ============ SÉLECTEUR DE RÔLE PERSONNALISÉ ============
function createCustomRoleSelector() {
  const roleInput = document.querySelector("#participant-role");
  if (!roleInput) return;

  // Créer le nouveau sélecteur
  const roleSelectorHTML = `
    <div class="role-selector" data-selected-role="en-attente">
      <button type="button" class="role-selector-button">
        <div class="role-display">
          <div class="role-icon en-attente">⏳</div>
          <span>En attente</span>
        </div>
        <span>▼</span>
      </button>
      <div class="role-dropdown">
        <div class="role-option selected" data-role="en-attente">
          <div class="role-icon en-attente">⏳</div>
          <span>En attente</span>
        </div>
        <div class="role-option" data-role="qualifie">
          <div class="role-icon qualifie">🏆</div>
          <span>Qualifié</span>
        </div>
        <div class="role-option" data-role="elimine">
          <div class="role-icon elimine">❌</div>
          <span>Éliminé</span>
        </div>
      </div>
    </div>
  `;

  // Remplacer l'ancien input
  roleInput.outerHTML = roleSelectorHTML;

  // Ajouter les événements
  setupRoleSelectorEvents();
}

function setupRoleSelectorEvents() {
  const roleSelector = document.querySelector(".role-selector");
  const roleSelectorButton = document.querySelector(".role-selector-button");
  const roleDropdown = document.querySelector(".role-dropdown");
  const roleOptions = document.querySelectorAll(".role-option");

  if (!roleSelector || !roleSelectorButton || !roleDropdown) return;

  // Toggle dropdown
  roleSelectorButton.addEventListener("click", (e) => {
    e.stopPropagation();
    roleDropdown.classList.toggle("show");
  });

  // Fermer le dropdown en cliquant ailleurs
  document.addEventListener("click", (e) => {
    if (!roleSelector.contains(e.target)) {
      roleDropdown.classList.remove("show");
    }
  });

  // Gestion des options
  roleOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const selectedRole = option.dataset.role;
      const roleIcon = option.querySelector(".role-icon").outerHTML;
      const roleText = option.querySelector("span").textContent;

      // Mettre à jour l'affichage
      roleSelectorButton.querySelector(".role-display").innerHTML = `
        ${roleIcon}
        <span>${roleText}</span>
      `;

      // Mettre à jour la sélection
      roleSelector.dataset.selectedRole = selectedRole;

      // Mettre à jour les classes selected
      roleOptions.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");

      // Fermer le dropdown
      roleDropdown.classList.remove("show");
    });
  });

  // Support clavier
  roleSelectorButton.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      roleDropdown.classList.toggle("show");
    }
  });
}

function resetRoleSelector() {
  const roleSelector = document.querySelector(".role-selector");
  const roleSelectorButton = document.querySelector(".role-selector-button");
  const roleOptions = document.querySelectorAll(".role-option");
  const roleDropdown = document.querySelector(".role-dropdown");

  if (!roleSelector || !roleSelectorButton) return;

  // Reset à "En attente"
  roleSelector.dataset.selectedRole = "en-attente";

  roleSelectorButton.querySelector(".role-display").innerHTML = `
    <div class="role-icon en-attente">⏳</div>
    <span>En attente</span>
  `;

  // Reset les classes selected
  roleOptions.forEach((opt) => opt.classList.remove("selected"));
  document.querySelector('[data-role="en-attente"]')?.classList.add("selected");

  // Fermer le dropdown
  roleDropdown?.classList.remove("show");
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
          participants.push({
            id: Date.now(),
            name: data.name,
            role: data.role,
            offline: true,
          });
          backupToLocalStorage();
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
      "https://gmaing.netlify.app/.netlify/functions/get-participants"
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

// ============ AFFICHAGE UI ============
function addParticipantToUI(name, role) {
  if (!participantsList) return;

  // Emoji selon le rôle
  const roleEmojis = {
    "en-attente": "⏳",
    qualifie: "🏆",
    elimine: "❌",
  };

  const emoji = roleEmojis[role] || "🎮";
  const roleText = role.replace("-", " ");

  const li = document.createElement("li");
  li.textContent = `${emoji} ${name} (${roleText})`;
  li.className = "participant-item";
  participantsList.appendChild(li);
}

// ============ UPLOAD CSV ============
function setupFileUpload() {
  const fileInput = document.querySelector("#csvFile");
  const loadButton = document.querySelector('button[onclick="readCSV()"]');

  if (fileInput && loadButton) {
    // Wrapper dans une section
    const wrapper = document.createElement("div");
    wrapper.className = "file-section";
    wrapper.innerHTML = `
      <h3>📄 Charger depuis un fichier CSV</h3>
      ${fileInput.outerHTML}
      ${loadButton.outerHTML}
    `;

    fileInput.parentNode.replaceChild(wrapper, fileInput);
    loadButton.remove();
  }
}

function readCSV() {
  const fileInput = document.querySelector("#csvFile");
  const file = fileInput?.files[0];

  if (!file) {
    showMessage("⚠️ Veuillez sélectionner un fichier CSV", "warning");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const csv = e.target.result;
      const lines = csv.split("\n");
      const csvParticipants = [];

      // Parser le CSV (ignorer la première ligne si c'est un header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const [name, role] = line.split(",").map((s) => s.trim());
          if (name && role) {
            csvParticipants.push({ name, role });
          }
        }
      }

      // Afficher dans la liste CSV
      displayCSVParticipants(csvParticipants);
      showMessage(
        `📄 ${csvParticipants.length} participants chargés depuis le CSV`,
        "success"
      );
    } catch (error) {
      console.error("❌ Erreur lecture CSV:", error);
      showMessage("❌ Erreur lors de la lecture du fichier", "error");
    }
  };

  reader.readAsText(file);
}

function displayCSVParticipants(csvParticipants) {
  if (!csvParticipantsList) return;

  csvParticipantsList.innerHTML = "";

  csvParticipants.forEach((participant) => {
    const li = document.createElement("li");
    li.textContent = `📄 ${participant.name} (${participant.role})`;
    csvParticipantsList.appendChild(li);
  });
}

// Rendre la fonction globale
window.readCSV = readCSV;

// ============ TEST BACKGROUND SYNC ============
function setupTestButton() {
  const testButton = document.querySelector(
    'button[onclick="testBackgroundSync()"]'
  );
  if (testButton) {
    testButton.onclick = testBackgroundSync;
  }
}

function testBackgroundSync() {
  if (
    "serviceWorker" in navigator &&
    "sync" in window.ServiceWorkerRegistration.prototype
  ) {
    navigator.serviceWorker.ready
      .then((reg) => {
        return reg.sync.register("sync-participants");
      })
      .then(() => {
        console.log("🔄 Background sync testé");
        showMessage("🔄 Test de synchronisation lancé", "info");
      })
      .catch((err) => {
        console.error("❌ Erreur test sync:", err);
        showMessage("❌ Erreur de test", "error");
      });
  } else {
    showMessage("❌ Background Sync non supporté", "error");
  }
}

// Rendre la fonction globale
window.testBackgroundSync = testBackgroundSync;

function showMessage(message, type = "info") {
  // Supprimer les notifications existantes
  const existing = document.querySelectorAll(".notification");
  existing.forEach((n) => n.remove());

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
    ${type === "info" ? "background: #2196F3;" : ""}
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

// Sauvegarder toutes les secondes
setInterval(backupToLocalStorage, 1000);

console.log(
  "🎮 Application Tournoi Gaming initialisée avec sélecteur de rôle personnalisé"
);
