// Proxy Cloudflare Pages Functions -> D1 (substitui o Neon).
// Mesmo contrato HTTP de antes: o frontend (src/lib/supabase.ts) não muda.
// Fotos NÃO trafegam no sync: getAll(players) exclui a coluna image (R2 na Fase 3).

const ALLOWED_TABLES = new Set([
  'config', 'confirmations', 'players', 'matches',
  'transactions', 'unpaidMembers', 'standings', 'trainingLogs'
]);

// Colunas que permanecem camelCase no D1 (resto é lowercase)
const KEEP_CAMEL = new Set([
  'goalScorers', 'confirmedPlayers', 'absentPlayers', 'goalkeeperId',
  'daysLate', 'isPaid', 'paymentStatus', 'playersCount'
]);

function toDbKey(key) {
  if (KEEP_CAMEL.has(key)) return key;
  return key.toLowerCase();
}

const TO_APP = {
  players: { isinjured: 'isInjured', injurynote: 'injuryNote', cleansheets: 'cleanSheets', isboardmember: 'isBoardMember', mustchangepin: 'mustChangePin', birthdate: 'birthDate', hasimage: 'hasImage', isexempt: 'isExempt' },
  matches: { hometeam: 'homeTeam', homelogo: 'homeLogo', awayteam: 'awayTeam', awaylogo: 'awayLogo', homescore: 'homeScore', awayscore: 'awayScore', isconfirmed: 'isConfirmed', confirmedplayers: 'confirmedPlayers', absentplayers: 'absentPlayers', goalscorers: 'goalScorers' },
  transactions: { expensetype: 'expenseType', chargedtoplayers: 'chargedToPlayers', paidby: 'paidBy' },
  standings: { goaldifference: 'goalDifference', logotext: 'logoText' },
  config: { adminpassword: 'adminPassword', pixkey: 'pixKey', pixownerid: 'pixOwnerId' },
  unpaidMembers: { paymentstatus: 'paymentStatus' },
};

const BOOL_COLS = {
  players: new Set(['isinjured', 'mustchangepin', 'isboardmember', 'isexempt']),
  matches: new Set(['isconfirmed']),
  transactions: new Set(['chargedtoplayers', 'cancelled']),
  standings: new Set([]),
  config: new Set([]),
  unpaidMembers: new Set(['isPaid', 'cancelled']),
  trainingLogs: new Set([]),
  confirmations: new Set([]),
};

const JSON_COLS = {
  matches: new Set(['goalScorers', 'confirmedPlayers', 'absentPlayers']),
  standings: new Set(['form']),
  players: new Set([]),
  transactions: new Set([]),
  config: new Set([]),
  unpaidMembers: new Set([]),
  trainingLogs: new Set([]),
  confirmations: new Set([]),
};

// Colunas de players lidas no sync (SEM image: foto só sob demanda via /api/image)
const PLAYER_COLS = ['id', 'name', 'number', 'position', 'country', 'age', 'rating',
  '"condition"', 'isinjured', 'injurynote', 'games', 'goals', 'cleansheets', 'tackles',
  'squad', 'birthdate', 'phone', 'pin', 'mustchangepin', 'isboardmember', 'isexempt', 'imagekey',
  'image IS NOT NULL AS hasimg'];

function sanitizeTable(table) {
  if (!ALLOWED_TABLES.has(table)) throw new Error(`Invalid table: ${table}`);
  return `"${table}"`;
}

function parseMaybeJson(v) {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if ((t.startsWith('[') || t.startsWith('{')) && t.length > 1) {
    try { return JSON.parse(t); } catch { return v; }
  }
  return v;
}

function toCamel(table, row) {
  const map = TO_APP[table] || {};
  const bools = BOOL_COLS[table] || new Set();
  const jsons = JSON_COLS[table] || new Set();
  const result = {};
  for (const [k, v] of Object.entries(row)) {
    const appKey = map[k] || k;
    let val = v;
    if (bools.has(k)) val = v === 1 || v === true ? true : v === 0 || v === false ? false : v;
    if (jsons.has(k) || jsons.has(appKey)) val = parseMaybeJson(val);
    result[appKey] = val;
  }
  // Legado: scorers-JSON (string) vira goalScorers para resolver nomes no app
  if (table === 'matches' && (result.goalScorers === null || result.goalScorers === undefined || result.goalScorers === '') && typeof result.scorers === 'string') {
    const t = result.scorers.trim();
    if (t.startsWith('[{')) {
      try { result.goalScorers = JSON.parse(t); delete result.scorers; } catch { /* mantém original */ }
    }
  }
  return result;
}

function normalizeForDb(table, data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (k === 'hasImage') continue;
    if ((k === 'image' || k === 'homeLogo' || k === 'awayLogo') && typeof v === 'string' && v.startsWith('/api/')) continue;
    const dbKey = toDbKey(k);
    out[dbKey] = (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
  }
  return out;
}

function jsonHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store'
  };
}

async function sha256hex(input) {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestOptions = async () => new Response(null, { status: 200, headers: jsonHeaders() });

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const table = url.searchParams.get('table');
  const id = url.searchParams.get('id');
  return handleOp(context, { op, table, id, data: undefined });
}

export async function onRequestPost(context) {
  const { request } = context;
  const body = await request.json().catch(() => ({}));
  return handleOp(context, body);
}

async function handleOp(context, body) {
  const { request, env } = context;
  const { op, table, id, data } = body;

  try {
    if (!op) return new Response(JSON.stringify({ error: 'missing op' }), { status: 400, headers: jsonHeaders() });
    const DB = env.DB;
    if (!DB) return new Response(JSON.stringify({ error: 'd1_not_bound' }), { status: 500, headers: jsonHeaders() });

    const isWriteOp = op === 'upsert' || op === 'delete' || op === 'upsertMany' || op === 'saveConfig';
    if (isWriteOp) {
      const WRITE_SECRET = env.WRITE_SECRET;
      if (!WRITE_SECRET) return new Response(JSON.stringify({ error: 'write_secret_not_configured' }), { status: 500, headers: jsonHeaders() });
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${WRITE_SECRET}`) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders() });
      }
    }

    switch (op) {
      case 'getAll': {
        const t = sanitizeTable(table);
        let rows;
        if (table === 'players') {
          const res = await DB.prepare(`SELECT ${PLAYER_COLS.join(', ')} FROM ${t} ORDER BY id`).all();
          rows = (res.results || []).map(r => {
            const { imagekey, hasimg, ...rest } = r;
            const imageUrl = (imagekey || hasimg) ? `/api/image?id=${r.id}` : '';
            return toCamel('players', { ...rest, hasImage: !!imageUrl, image: imageUrl });
          });
          return new Response(JSON.stringify(rows), { headers: jsonHeaders() });
        }
        const res = await DB.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
        rows = res.results || [];
        if (table === 'matches') {
          rows = rows.map(r => {
            const hl = r.homelogo && r.homelogo.startsWith('data:') ? `/api/logo?id=${r.id}&team=home` : (r.homelogo || '');
            const al = r.awaylogo && r.awaylogo.startsWith('data:') ? `/api/logo?id=${r.id}&team=away` : (r.awaylogo || '');
            return toCamel('matches', { ...r, homelogo: hl, awaylogo: al });
          });
          return new Response(JSON.stringify(rows), { headers: jsonHeaders() });
        }
        return new Response(JSON.stringify(rows.map(r => toCamel(table, r))), { headers: jsonHeaders() });
      }

      case 'getDoc': {
        const t = sanitizeTable(table);
        const row = await DB.prepare(`SELECT * FROM ${t} WHERE id = ?`).bind(id).first();
        if (!row) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: jsonHeaders() });
        if (table === 'confirmations') {
          return new Response(JSON.stringify({ id: row.id, data: parseMaybeJson(row.data) || {} }), { headers: jsonHeaders() });
        }
        return new Response(JSON.stringify(toCamel(table, row)), { headers: jsonHeaders() });
      }

      case 'upsert': {
        const t = sanitizeTable(table);
        const mapped = normalizeForDb(table, data || {});
        const cols = Object.keys(mapped);
        if (cols.length === 0) return new Response(JSON.stringify({ error: 'empty_data' }), { status: 400, headers: jsonHeaders() });
        if (!('id' in mapped)) return new Response(JSON.stringify({ error: 'missing_id' }), { status: 400, headers: jsonHeaders() });
        const vals = cols.map(c => mapped[c]);
        const placeholders = cols.map(() => '?');
        // Merge (nunca REPLACE): atualiza só as colunas enviadas, preserva o resto da linha
        const nonId = cols.filter(c => c !== 'id');
        const upsertSql = nonId.length === 0
          ? `INSERT INTO ${t} (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT(id) DO NOTHING`
          : `INSERT INTO ${t} (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT(id) DO UPDATE SET ${nonId.map(c => `"${c}" = excluded."${c}"`).join(', ')}`;
        await DB.prepare(upsertSql).bind(...vals).run();
        return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders() });
      }

      case 'upsertMany': {
        const t = sanitizeTable(table);
        if (!Array.isArray(data) || data.length === 0) return new Response(JSON.stringify({ error: 'data_array_required' }), { status: 400, headers: jsonHeaders() });
        // Lotes de 40 (limite de queries por invocação no plano grátis)
        for (let i = 0; i < data.length; i += 40) {
          const chunk = data.slice(i, i + 40);
          const stmts = chunk.map(item => {
            const mapped = normalizeForDb(table, item);
            const cols = Object.keys(mapped);
            const vals = cols.map(c => mapped[c]);
            const nonId = cols.filter(c => c !== 'id');
            const sql = nonId.length === 0
              ? `INSERT INTO ${t} (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT(id) DO NOTHING`
              : `INSERT INTO ${t} (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT(id) DO UPDATE SET ${nonId.map(c => `"${c}" = excluded."${c}"`).join(', ')}`;
            return DB.prepare(sql).bind(...vals);
          });
          await DB.batch(stmts);
        }
        return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders() });
      }

      case 'delete': {
        const t = sanitizeTable(table);
        await DB.prepare(`DELETE FROM ${t} WHERE id = ?`).bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders() });
      }

      case 'auth': {
        const writeToken = env.WRITE_SECRET || null;
        const { type, credential, playerId } = data || {};
        if (type === 'admin_master') {
          const row = await DB.prepare(`SELECT adminpassword FROM config WHERE id = 'app'`).first();
          if (!row) return new Response(JSON.stringify({ valid: false, error: 'config_not_found' }), { headers: jsonHeaders() });
          const hashInput = await sha256hex(credential || '');
          if (row.adminpassword !== hashInput) return new Response(JSON.stringify({ valid: false, error: 'invalid_admin_password' }), { headers: jsonHeaders() });
          return new Response(JSON.stringify({ valid: true, role: 'admin', isAdmin: true, writeToken }), { headers: jsonHeaders() });
        }
        if (type === 'pin') {
          if (!playerId) return new Response(JSON.stringify({ valid: false, error: 'playerId_required' }), { headers: jsonHeaders() });
          const row = await DB.prepare(`SELECT pin, isboardmember, mustchangepin FROM players WHERE id = ?`).bind(playerId).first();
          if (!row) return new Response(JSON.stringify({ valid: false, error: 'player_not_found' }), { headers: jsonHeaders() });
          const hashInput = await sha256hex(credential || '');
          if (row.pin !== hashInput) return new Response(JSON.stringify({ valid: false, error: 'invalid_pin' }), { headers: jsonHeaders() });
          return new Response(JSON.stringify({
            valid: true,
            role: row.isboardmember ? 'admin' : 'player',
            playerId,
            isBoardMember: !!row.isboardmember,
            mustChangePin: !!row.mustchangepin,
            writeToken,
          }), { headers: jsonHeaders() });
        }
        return new Response(JSON.stringify({ valid: false, error: 'invalid_type' }), { headers: jsonHeaders() });
      }

      case 'changePin': {
        const { playerId, currentPin, newPin } = data || {};
        const row = await DB.prepare(`SELECT pin FROM players WHERE id = ?`).bind(playerId).first();
        if (!row) return new Response(JSON.stringify({ success: false, error: 'player_not_found' }), { headers: jsonHeaders() });
        const hashCurrent = await sha256hex(currentPin || '');
        if (row.pin !== hashCurrent) return new Response(JSON.stringify({ success: false, error: 'invalid_current_pin' }), { headers: jsonHeaders() });
        const hashNew = await sha256hex(newPin || '');
        await DB.prepare(`UPDATE players SET pin = ?, mustchangepin = 0 WHERE id = ?`).bind(hashNew, playerId).run();
        return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders() });
      }

      case 'confirmAttendance': {
        const { matchId, playerId, status } = data || {};
        if (!matchId || !playerId || !status) return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: jsonHeaders() });
        const row = await DB.prepare(`SELECT data FROM "confirmations" WHERE id = 'singleton'`).first();
        let currentData = {};
        if (row && row.data) {
          try { currentData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data; } catch { currentData = {}; }
        }
        if (!currentData[matchId]) currentData[matchId] = {};
        currentData[matchId][playerId] = status;
        const payload = JSON.stringify(currentData);
        await DB.prepare(`INSERT OR REPLACE INTO "confirmations" (id, data) VALUES ('singleton', ?)`).bind(payload).run();
        return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders() });
      }

      default:
        return new Response(JSON.stringify({ error: 'unknown op' }), { status: 400, headers: jsonHeaders() });
    }
  } catch (e) {
    console.error('[db] Error:', e && e.message);
    return new Response(JSON.stringify({ error: (e && e.message) || 'internal_error' }), { status: 500, headers: jsonHeaders() });
  }
}
