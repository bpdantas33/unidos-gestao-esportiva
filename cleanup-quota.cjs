const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch, query, orderBy } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyB5bHcA6bPreEgDtqcb_sCWCUf21Abnc-o",
  authDomain: "gen-lang-client-0488712142.firebaseapp.com",
  projectId: "gen-lang-client-0488712142",
  storageBucket: "gen-lang-client-0488712142.firebasestorage.app",
  messagingSenderId: "34527626826",
  appId: "1:34527626826:web:663ac332110f044ec588b3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-1aa8d619-5d39-49fe-a797-0b814fd6c276");

async function cleanup() {
  console.log('Limpando UnpaidMembers duplicados...');

  // Carrega todos os unpaidMembers
  const snap = await getDocs(collection(db, 'unpaidMembers'));
  const all = [];
  snap.forEach(d => all.push({ id: d.id, ...d.data() }));
  console.log(`Total de UnpaidMembers: ${all.length}`);

  // Agrupa por nome + reason
  const groups = {};
  for (const u of all) {
    const key = `${u.name}|${u.reason || ''}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(u);
  }

  let deleted = 0;
  const batch = writeBatch(db);
  for (const [key, items] of Object.entries(groups)) {
    if (items.length <= 1) continue;
    // Mantém o primeiro, deleta o resto
    for (let i = 1; i < items.length; i++) {
      const ref = doc(db, 'unpaidMembers', items[i].id);
      batch.delete(ref);
      deleted++;
    }
  }

  if (deleted > 0) {
    await batch.commit();
    console.log(`Deletados ${deleted} UnpaidMembers duplicados.`);
  } else {
    console.log('Nenhum duplicado encontrado.');
  }

  console.log('\nVerificando jogadores sem PIN...');
  const playerSnap = await getDocs(collection(db, 'players'));
  let missingPin = 0;
  playerSnap.forEach(d => {
    const data = d.data();
    if (!data.pin) {
      console.log(`  Jogador sem PIN: ${data.name} (${d.id})`);
      missingPin++;
    }
  });
  console.log(`Total de jogadores sem PIN: ${missingPin}`);

  console.log('\nLimpeza concluída!');
}

cleanup().catch(console.error);
