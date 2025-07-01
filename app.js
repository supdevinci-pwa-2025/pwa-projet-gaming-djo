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
    .register("sync-snacks") // indice: méthode pour enregistrer une sync
    .then(() => console.log("📡 Sync enregistrée"))
    .catch((err) => console.error("❌ Erreur sync:", err));
});
