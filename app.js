if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/serviceWorker.js")
    .then((reg) => {
      // registration worked
      console.log("Enregistrement réussi");
    })
    .catch((error) => {
      // registration failed
      console.log("Erreur : " + error);
    });
}

let people = JSON.parse(localStorage.getItem("gamingData")) || [];

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

// Étapes pour le BACKGROUND SYNC
// Enregistrer une tâche de synchronisation depuis la page (app.js)
// Après avoir enregistré ton service worker, tu peux dire :

// « Dès que possible, déclenche un background sync avec le tag sync-snacks ».

// Code à trous (dans app.js)

navigator.serviceWorker.ready.then((reg) => {
  console.log("YEP");
  reg.sync
    .register("sync-participants") // indice: méthode pour enregistrer une sync
    .then(() => console.log("📡 Sync enregistrée"))
    .catch((err) => console.error("❌ Erreur sync:", err));
});

async function syncParticipants() {
  console.log(" Début de la synchronisation...");

  // 1️⃣ Lire la liste des participants en attente
  const pending = await document.getElementById("peopleList"); // indice: fonction qui lit IndexedDB
  console.log(`${pending.length} participant(s) à synchroniser`);

  let success = 0;
  let fail = 0;

  // 2️⃣ Boucle principale
  for (const participant of pending) {
    try {
      console.log(`🚀 Envoi de ${participant.name}`); // indice: propriété du participant à afficher

      const response = await fetch("/api/participants", {
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
