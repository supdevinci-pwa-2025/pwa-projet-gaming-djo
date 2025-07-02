/*** ouvre automatiquement ta DB gaming-db,
Crée un objectStore appelé participants avec clé auto-incrémentée id,
Permet d’ajouter un participant avec addParticipants({ name, role }),
Et de lire toute la liste avec getAllParticipants().
 */

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gaming-db", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("participants", {
        keyPath: "id",
        autoIncrement: true,
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function addParticipants(participant) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("participants", "readwrite");
      tx.objectStore("participants").add(participant);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

export function getAllParticipants() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("participants", "readonly");
      const store = tx.objectStore("participants");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}
