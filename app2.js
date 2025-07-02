// Service Worker Registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/serviceWorker.js")
    .then((reg) => {
      console.log("✅ Service Worker enregistré avec succès");

      // Background Sync Registration
      return navigator.serviceWorker.ready;
    })
    .then((reg) => {
      console.log("🔄 Service Worker prêt");
      return reg.sync.register("syncParticipants");
    })
    .then(() => {
      console.log("📡 Background Sync enregistré");
    })
    .catch((error) => {
      console.error("❌ Erreur Service Worker/Sync:", error);
    });
}

// Data Management with improved localStorage
let people = [];

// Load data from localStorage with error handling
function loadData() {
  try {
    const stored = localStorage.getItem("participants");
    people = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("❌ Erreur lors du chargement des données:", error);
    people = [];
  }
}

// Save data to localStorage with error handling
function saveData() {
  try {
    localStorage.setItem("participants", JSON.stringify(people));
    console.log("💾 Données sauvegardées");
  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde:", error);
  }
}

// Add person with improved validation and UX
function addPerson() {
  const nameInput = document.getElementById("personName");
  const roleInput = document.getElementById("personRole");
  const name = nameInput.value.trim();
  const role = roleInput.value;

  // Validation
  if (name === "") {
    showNotification("⚠️ Veuillez entrer un nom de joueur", "warning");
    nameInput.focus();
    return;
  }

  // Check for duplicates
  if (
    people.some((person) => person.name.toLowerCase() === name.toLowerCase())
  ) {
    showNotification("🚫 Ce joueur existe déjà dans la liste", "error");
    nameInput.focus();
    return;
  }

  // Add person with unique ID and timestamp
  const newPerson = {
    id: Date.now(),
    name,
    role,
    addedAt: new Date().toISOString(),
  };

  people.push(newPerson);
  saveData();

  // Reset form
  nameInput.value = "";
  roleInput.value = "En attente";

  // Update display with animation
  displayPeople();
  showNotification(`✅ ${name} ajouté(e) avec succès !`, "success");

  // Trigger background sync if available
  triggerBackgroundSync();
}

// Remove person with confirmation
function removePerson(index) {
  const person = people[index];
  if (!person) return;

  // Simple confirmation
  if (confirm(`Êtes-vous sûr de vouloir supprimer ${person.name} ?`)) {
    people.splice(index, 1);
    saveData();
    displayPeople();
    showNotification(`🗑️ ${person.name} supprimé(e)`, "info");
    triggerBackgroundSync();
  }
}

// Display people with enhanced UI
function displayPeople() {
  const list = document.getElementById("peopleList");

  // Clear existing content except the title
  const existingPersons = list.querySelectorAll(".person");
  existingPersons.forEach((person) => person.remove());

  // Count statistics
  const count = {
    total: people.length,
    "En attente": 0,
    Qualifié: 0,
    Éliminé: 0,
  };

  // Create person elements
  people.forEach((person, index) => {
    const div = document.createElement("div");
    div.className = "person";

    // Get first letter for avatar
    const initial = person.name.charAt(0).toUpperCase();

    // Create status badge with emoji
    const statusEmojis = {
      "En attente": "⏳",
      Qualifié: "🏆",
      Éliminé: "❌",
    };

    div.innerHTML = `
      <span data-initial="${initial}">
        ${person.name} ${statusEmojis[person.role] || ""} ${person.role}
      </span>
      <button onclick="removePerson(${index})" title="Supprimer ${person.name}">
        🗑️
      </button>
    `;

    list.appendChild(div);
    count[person.role]++;
  });

  // Update statistics
  updateStats(count);
}

// Update statistics display
function updateStats(count) {
  const elements = {
    total: document.getElementById("total"),
    "en attente": document.getElementById("en attente"),
    qualifié: document.getElementById("qualifié"),
    éliminé: document.getElementById("éliminé"),
  };

  if (elements.total) elements.total.textContent = count.total;
  if (elements["en attente"])
    elements["en attente"].textContent = count["En attente"];
  if (elements.qualifié) elements.qualifié.textContent = count["Qualifié"];
  if (elements.éliminé) elements.éliminé.textContent = count["Éliminé"];
}

// Show notification system
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  // Create notification
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 12px;
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  `;

  // Set background color based on type
  const colors = {
    success: "linear-gradient(135deg, #10b981, #047857)",
    error: "linear-gradient(135deg, #ef4444, #dc2626)",
    warning: "linear-gradient(135deg, #f59e0b, #d97706)",
    info: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  };

  notification.style.background = colors[type] || colors.info;
  notification.textContent = message;

  // Add CSS animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideInRight 0.3s ease-out reverse";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

// Background sync trigger
function triggerBackgroundSync() {
  if (
    "serviceWorker" in navigator &&
    "sync" in window.ServiceWorkerRegistration.prototype
  ) {
    navigator.serviceWorker.ready
      .then((reg) => {
        return reg.sync.register("syncParticipants");
      })
      .catch((err) => {
        console.warn("⚠️ Background sync non disponible:", err);
      });
  }
}

// Enhanced keyboard support
function setupKeyboardSupport() {
  const nameInput = document.getElementById("personName");
  const roleInput = document.getElementById("personRole");

  if (nameInput) {
    nameInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addPerson();
      }
    });
  }

  // Tab navigation improvement
  if (roleInput) {
    roleInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addPerson();
      }
    });
  }
}

// Data export functionality
function exportData() {
  const dataStr = JSON.stringify(people, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tournoi-gaming-${
    new Date().toISOString().split("T")[0]
  }.json`;
  link.click();
  URL.revokeObjectURL(url);
  showNotification("📄 Données exportées !", "success");
}

// Initialize app
function initApp() {
  loadData();
  displayPeople();
  setupKeyboardSupport();

  // Add export button if needed (optional)
  console.log("🎮 Application Tournoi Gaming initialisée");
  console.log(`📊 ${people.length} participants chargés`);
}

// Connection status monitoring
function setupConnectionMonitoring() {
  window.addEventListener("online", () => {
    showNotification("🌐 Connexion rétablie", "success");
    triggerBackgroundSync();
  });

  window.addEventListener("offline", () => {
    showNotification("📵 Mode hors ligne", "warning");
  });
}

// Start the app when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  initApp();
  setupConnectionMonitoring();
});

// Export functions for potential use in other scripts
window.tournoi = {
  addPerson,
  removePerson,
  exportData,
  people: () => [...people], // Return copy to prevent direct manipulation
};
