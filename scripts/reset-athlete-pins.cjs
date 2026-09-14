const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://gwltosenvditulkndkue.supabase.co',
  'sb_publishable_scNF0rLw6jtD0592NMWiIA_U8yMzm7s',
  { auth: { persistSession: false } }
);

const DEFAULT_PIN = '1234';

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

(async () => {
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, squad')
    .not('isboardmember', 'eq', true);

  if (error) { console.error('Erro:', error.message); return; }

  console.log(`Atletas nao diretores: ${players.length}\n`);

  const pinHash = hashPin(DEFAULT_PIN);
  let ok = 0, err = 0;

  for (const p of players) {
    const { error: e } = await supabase
      .from('players')
      .update({ pin: pinHash, mustchangepin: true })
      .eq('id', p.id);

    if (e) { console.error(`  ERRO ${p.id} ${p.name}: ${e.message}`); err++; }
    else { console.log(`  OK ${p.id} ${p.name} (${p.squad})`); ok++; }
  }

  console.log(`\nConcluido! ${ok} atualizados, ${err} erros.`);
  console.log(`PIN padrao: ${DEFAULT_PIN}`);
  console.log(`Hash: ${pinHash}`);
})();
