const https = require('https');
const http = require('http');

const PROJECT_ID = 'gen-lang-client-0488712142';
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase';
const NEW_DOMAINS = ['unidos-suzano.vercel.app', 'unidos-fc.vercel.app'];

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = (u.protocol === 'https:' ? https : http).request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function patch(url, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${token}`,
      },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: Device code
  console.log('Solicitando código de dispositivo...');
  const device = await post('https://oauth2.googleapis.com/device/code', {
    client_id: CLIENT_ID,
    scope: SCOPES,
  });
  if (device.error) {
    console.error('Erro:', device.error_description || device.error);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('ABRA O LINK abaixo no seu navegador:');
  console.log(device.verification_url);
  console.log('\nE DIGITE O CÓDIGO:');
  console.log(device.user_code);
  console.log('========================================\n');
  console.log('Faça login com sua conta Google (mesma do Firebase).');
  console.log('Depois de autorizar, volte aqui e pressione ENTER...');

  await new Promise(resolve => process.stdin.once('data', resolve));

  // Step 2: Poll for token
  console.log('Obtendo token...');
  let token = null;
  for (let i = 0; i < 60; i++) {
    const resp = await post('https://oauth2.googleapis.com/token', {
      client_id: CLIENT_ID,
      device_code: device.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
    if (resp.access_token) { token = resp.access_token; break; }
    if (resp.error === 'authorization_pending' || resp.error === 'slow_down') {
      await new Promise(r => setTimeout(r, resp.interval * 1000 || 5000));
      continue;
    }
    console.error('Erro:', resp.error_description || resp.error);
    process.exit(1);
  }
  if (!token) { console.error('Timeout aguardando autenticação'); process.exit(1); }

  // Step 3: Get current config
  console.log('Lendo configuração atual do Firebase Auth...');
  const config = await get(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`,
    token
  );
  const currentDomains = config.authorizedDomains || [];
  console.log('Domínios atuais:', currentDomains);

  const domainsToAdd = NEW_DOMAINS.filter(d => !currentDomains.includes(d));
  if (domainsToAdd.length === 0) {
    console.log('Todos os domínios já estão autorizados. Nada a fazer.');
    return;
  }

  // Step 4: Update
  const updated = [...new Set([...currentDomains, ...NEW_DOMAINS])];
  console.log(`Adicionando: ${domainsToAdd.join(', ')}`);
  const result = await patch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=authorizedDomains`,
    { authorizedDomains: updated },
    token
  );
  if (result.authorizedDomains) {
    console.log('✅ Domínios atualizados com sucesso!');
    console.log('Lista atual:', result.authorizedDomains);
  } else {
    console.error('Resposta inesperada:', JSON.stringify(result, null, 2));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
