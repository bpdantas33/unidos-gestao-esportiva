const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gwltosenvditulkndkue.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_scNF0rLw6jtD0592NMWiIA_U8yMzm7s';
const STORAGE_BASE = 'https://gwltosenvditulkndkue.supabase.co/storage/v1/object/public/players';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function imageExists(id) {
  try {
    const resp = await fetch(`${STORAGE_BASE}/${id}.jpg`, { method: 'HEAD' });
    return resp.ok;
  } catch {
    return false;
  }
}

async function run() {
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, image');
  if (error) {
    console.error('Erro ao buscar players:', error.message);
    process.exit(1);
  }

  let ok = 0, skip = 0, fail = 0;

  for (const p of players) {
    const storageUrl = `${STORAGE_BASE}/${p.id}.jpg`;
    if (p.image === storageUrl) {
      skip++;
      continue;
    }
    const exists = await imageExists(p.id);
    if (!exists) {
      console.log(`  PULANDO ${p.id} ${p.name}: sem imagem no storage`);
      skip++;
      continue;
    }
    const { error: updateError } = await supabase
      .from('players')
      .update({ image: storageUrl })
      .eq('id', p.id);
    if (updateError) {
      console.log(`  FALHA ${p.id} ${p.name}: ${updateError.message}`);
      fail++;
    } else {
      console.log(`  OK ${p.id} ${p.name}`);
      ok++;
    }
  }

  console.log(`\nResultado: ${ok} atualizados, ${skip} pulados, ${fail} falhas`);
}

run().catch(err => {
  console.error('\nErro fatal:', err.message);
  process.exit(1);
});
