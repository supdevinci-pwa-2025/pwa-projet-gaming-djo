let people = [];

function addPerson() {
    const nameInput = document.getElementById('personName');
    const roleSelect = document.getElementById('personRole');

    const name = nameInput.value.trim();
    const role = roleSelect.value;

    if (!name) {
        alert('Veuillez entrer un nom de joueur');
        return;
    }

    // Vérifier si le joueur existe déjà
    if (people.some(person => person.name.toLowerCase() === name.toLowerCase())) {
        alert('Ce joueur existe déjà dans la liste');
        return;
    }

    const person = {
        id: Date.now(),
        name: name,
        status: role
    };

    people.push(person);

    nameInput.value = '';
    roleSelect.value = 'en-attente';

    renderPeople();
    updateStats();
}

function deletePerson(id) {
    people = people.filter(person => person.id !== id);
    renderPeople();
    updateStats();
}

function renderPeople() {
    const peopleList = document.getElementById('peopleList');

    if (people.length === 0) {
        peopleList.innerHTML = `
      <div class="empty-state">
        <div class="icon">🎮</div>
        <h3>Aucun participant pour le moment</h3>
        <p>Ajoutez votre premier joueur pour commencer le tournoi !</p>
      </div>
    `;
        return;
    }

    peopleList.innerHTML = people.map(person => `
    <div class="person ${person.status}">
      <div class="person-info">
        <div class="person-avatar">
          ${person.name.charAt(0).toUpperCase()}
        </div>
        <div class="person-details">
          <h3>${person.name}</h3>
        </div>
      </div>
      <div class="person-actions">
        <span class="person-status ${person.status}">
          ${person.status.replace('-', ' ')}
        </span>
        <button onclick="deletePerson(${person.id})" class="btn-delete">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

function updateStats() {
    const total = people.length;
    const enAttente = people.filter(p => p.status === 'en-attente').length;
    const qualifie = people.filter(p => p.status === 'qualifié').length;
    const elimine = people.filter(p => p.status === 'éliminé').length;

    document.getElementById('total').textContent = total;
    document.getElementById('en-attente').textContent = enAttente;
    document.getElementById('qualifié').textContent = qualifie;
    document.getElementById('éliminé').textContent = elimine;
}

// Permettre d'ajouter un joueur avec Enter
document.getElementById('personName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addPerson();
    }
});

// Animation au chargement
document.addEventListener('DOMContentLoaded', function() {
    updateStats();
});