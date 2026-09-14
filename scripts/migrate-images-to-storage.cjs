const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gwltosenvditulkndkue.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = 'players';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  // 1. Create bucket
  console.log('Criando bucket players...');
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Erro ao criar bucket:', bucketError.message);
    return;
  }
  console.log('  OK\n');

  // 2. Fetch all players with images
  console.log('Buscando players...');
  const { data: players, error: fetchError } = await supabase
    .from('players')
    .select('id, name, image');
  if (fetchError) {
    console.error('Erro ao buscar players:', fetchError.message);
    return;
  }
  console.log(`  ${players.length} players encontrados\n`);

  let uploaded = 0, skipped = 0, failed = 0;

  for (const player of players) {
    const img = player.image;
    if (!img || !img.startsWith('data:')) {
      skipped++;
      continue;
    }

    // Extract format and data
    const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      console.log(`  PULANDO ${player.id} ${player.name}: formato desconhecido`);
      skipped++;
      continue;
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const fileName = `${player.id}.${ext}`;

    // Upload to Storage (replace if exists)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (uploadError) {
      console.log(`  FALHA ${player.id} ${player.name}: ${uploadError.message}`);
      failed++;
      continue;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    // Update player record
    const { error: updateError } = await supabase
      .from('players')
      .update({ image: publicUrl })
      .eq('id', player.id);

    if (updateError) {
      console.log(`  FALHA ${player.id} ${player.name}: ${updateError.message}`);
      failed++;
      continue;
    }

    console.log(`  OK ${player.id} ${player.name} -> ${fileName} (${Math.round(buffer.length / 1024)}KB)`);
    uploaded++;
  }

  console.log(`\nResultado: ${uploaded} uploads, ${skipped} pulados, ${failed} falhas`);
}

run().catch(err => {
  console.error('\nErro fatal:', err.message);
  process.exit(1);
});
