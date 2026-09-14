/**
 * Migração Firebase → Supabase
 * Usa os nomes de colunas REAIS que existem no Supabase (lowercase).
 * node migrate-firebase-to-supabase.cjs
 */
const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gwltosenvditulkndkue.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_scNF0rLw6jtD0592NMWiIA_U8yMzm7s';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB5bHcA6bPreEgDtqcb_sCWCUf21Abnc-o",
  authDomain: "gen-lang-client-0488712142.firebaseapp.com",
  projectId: "gen-lang-client-0488712142",
  storageBucket: "gen-lang-client-0488712142.firebasestorage.app",
  messagingSenderId: "34527626826",
  appId: "1:34527626826:web:663ac332110f044ec588b3"
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Mapa de transformação: camelCase (Firebase) → lowercase (colunas reais do Supabase)
const FIELD_MAP = {
  players: {
    isInjured: 'isinjured',
    injuryNote: 'injurynote',
    cleanSheets: 'cleansheets',
    isBoardMember: 'isboardmember',
    mustChangePin: 'mustchangepin',
    birthDate: 'birthdate',
  },
  matches: {
    homeTeam: 'hometeam',
    homeLogo: 'homelogo',
    awayTeam: 'awayteam',
    awayLogo: 'awaylogo',
    homeScore: 'homescore',
    awayScore: 'awayscore',
    isConfirmed: 'isconfirmed',
    confirmedPlayers: 'confirmedplayers',
  },
  transactions: {
    expenseType: 'expensetype',
    chargedToPlayers: 'chargedtoplayers',
  },
  unpaidMembers: {
    daysLate: 'daysLate',      // já está correto no Supabase
    isPaid: 'isPaid',          // já está correto no Supabase
  },
  standings: {
    goalDifference: 'goaldifference',
    logoText: 'logotext',
  },
};

// Aplica o mapeamento de campos para um documento
function mapFields(table, doc) {
  const map = FIELD_MAP[table];
  if (!map) return doc;
  const result = { ...doc };
  for (const [camel, lower] of Object.entries(map)) {
    if (camel in result) {
      result[lower] = result[camel];
      delete result[camel];
    }
  }
  return result;
}

// Tenta upsert, removendo colunas desconhecidas dinamicamente
const missingColumns = {};

async function upsertDoc(table, doc) {
  let attempt = mapFields(table, { ...doc });
  const colsRemoved = [];
  while (true) {
    const { error } = await supabase.from(table).upsert(attempt);
    if (!error) return { ok: true, colsRemoved };
    const match = error.message.match(/Could not find the '([^']+)' column/);
    if (!match) return { ok: false, error: error.message, colsRemoved };
    const col = match[1];
    colsRemoved.push(col);
    if (!missingColumns[table]) missingColumns[table] = {};
    missingColumns[table][col] = (missingColumns[table][col] || 0) + 1;
    const { [col]: _, ...rest } = attempt;
    attempt = rest;
  }
}

async function migrate() {
  console.log('Conectando ao Firebase...');
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  console.log('Firebase autenticado, uid:', auth.currentUser?.uid);
  const db = getFirestore(app, "ai-studio-1aa8d619-5d39-49fe-a797-0b814fd6c276");

  // 1. Migrar coleções
  const collections = ['players', 'matches', 'transactions', 'unpaidMembers', 'standings', 'trainingLogs'];
  let totalOk = 0, totalFail = 0;

  for (const col of collections) {
    console.log(`\n--- ${col} ---`);
    const snapshot = await getDocs(collection(db, col));
    if (snapshot.empty) { console.log('  Vazia, pulando'); continue; }

    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`  ${docs.length} documentos no Firebase`);

    // Deleta dados existentes no Supabase (se houver) para reinserir limpo
    try {
      await supabase.from(col).delete().neq('id', 'dummy');
    } catch (_) {}

    let ok = 0, fail = 0;
    // Limpa colunas faltantes do cache (já que limpamos a tabela)
    delete missingColumns[col];
    
    for (let i = 0; i < docs.length; i++) {
      const result = await upsertDoc(col, docs[i]);
      if (result.ok) {
        ok++;
        if (i % 5 === 0 || i === docs.length - 1 || result.colsRemoved.length > 0) {
          const extra = result.colsRemoved.length > 0 ? ` (removeu: ${result.colsRemoved.join(',')})` : '';
          process.stdout.write(`\r  ${i + 1}/${docs.length} OK${extra}`);
        }
      } else {
        fail++;
        process.stdout.write(`\r  ${i + 1}/${docs.length} FALHA: ${result.error.slice(0, 60)}`);
      }
    }
    console.log(`\n  Resultado: ${ok} OK, ${fail} falhas`);
    totalOk += ok; totalFail += fail;
  }

  // 2. Config (admin password)
  console.log('\n--- config ---');
  try {
    const cfgSnap = await getDoc(doc(db, 'config', 'app'));
    if (cfgSnap.exists()) {
      await supabase.from('config').upsert({ id: 'app', ...cfgSnap.data() });
      console.log('  OK');
    } else {
      console.log('  Não encontrado');
    }
  } catch (e) { console.error('  ERRO:', e.message); }

  // 3. Confirmations
  console.log('\n--- confirmations ---');
  try {
    const confSnap = await getDoc(doc(db, 'meta', 'confirmations'));
    if (confSnap.exists()) {
      const raw = confSnap.data();
      const { error } = await supabase.from('confirmations').upsert({ id: 'singleton', data: raw.data || raw });
      if (error) console.error('  ERRO:', error.message);
      else console.log('  OK');
    } else { console.log('  Não encontrado'); }
  } catch (e) { console.error('  ERRO:', e.message); }

  console.log(`\n✅ Migração concluída! Total: ${totalOk} OK, ${totalFail} falhas`);
}

migrate().catch(err => {
  console.error('\n❌ Migração falhou:', err.message);
  process.exit(1);
});
