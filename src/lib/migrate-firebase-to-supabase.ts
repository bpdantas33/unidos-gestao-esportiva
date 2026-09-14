import { createClient } from '@supabase/supabase-js';

// Supabase config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gwltosenvditulkndkue.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_scNF0rLw6jtD0592NMWiIA_U8yMzm7s';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/**
 * Executa a migração: lê do Firebase e escreve no Supabase.
 * Idempotente: pode rodar várias vezes sem duplicar dados.
 */
export async function migrateFirebaseToSupabase(firebaseDb: any): Promise<{ success: boolean; error?: string }> {
  const collections = ['players', 'matches', 'transactions', 'unpaidMembers', 'standings', 'trainingLogs'] as const;
  const singleDocs = [
    { table: 'config', id: 'app' },
    { table: 'confirmations', id: 'singleton' },
  ] as const;

  try {
    // 1. Coleções
    for (const col of collections) {
      const { getDocs, collection } = await import('firebase/firestore');
      const snapshot = await getDocs(collection(firebaseDb, col));

      if (snapshot.empty) {
        console.log(`[Migração] ${col}: vazia, pulando`);
        continue;
      }

      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const { error } = await supabase.from(col).upsert(docs).select();
      if (error) throw error;
      console.log(`[Migração] ${col}: ${docs.length} documentos migrados`);
    }

    // 2. Documentos únicos
    for (const { table, id } of singleDocs) {
      const { getDoc, doc } = await import('firebase/firestore');
      const snap = await getDoc(doc(firebaseDb, table === 'confirmations' ? 'meta' : table, table === 'confirmations' ? 'confirmations' : id));

      if (!snap.exists()) {
        console.log(`[Migração] ${table}: documento não encontrado, pulando`);
        continue;
      }

      const data = snap.data();
      const row = table === 'confirmations' ? { id, data } : { id, ...data };
      const { error } = await supabase.from(table).upsert(row).select();
      if (error) throw error;
      console.log(`[Migração] ${table}: migrado`);
    }

    localStorage.setItem('unidos_migrated_to_supabase', Date.now().toString());
    console.log('[Migração] Completa!');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Migração] Erro:', msg);
    return { success: false, error: msg };
  }
}
