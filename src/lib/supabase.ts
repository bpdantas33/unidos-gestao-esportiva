import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwltosenvditulkndkue.supabase.co';
const supabaseAnonKey = 'sb_publishable_scNF0rLw6jtD0592NMWiIA_U8yMzm7s';

const _client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true },
});

let _authEnsured = false;

export async function ensureAuth(): Promise<void> {
  if (_authEnsured) return;
  try {
    const { data: { session } } = await _client.auth.getSession();
    if (!session) {
      const { error } = await _client.auth.signInAnonymously();
      if (error) console.warn('[Supabase] Anon auth failed:', error.message);
    }
    _authEnsured = true;
  } catch (e) {
    console.warn('[Supabase] Auth init error:', e);
  }
}

export function getClient(): SupabaseClient {
  return _client;
}

// Colunas do Supabase estão em lowercase (auto-criadas sem quotes).
// Mapeamento: lowercase (DB) → camelCase (app)
const COL_READ: Record<string, Record<string, string>> = {
  players: {
    isinjured: 'isInjured', injurynote: 'injuryNote', cleansheets: 'cleanSheets',
    isboardmember: 'isBoardMember', mustchangepin: 'mustChangePin', birthdate: 'birthDate',
  },
  matches: {
    hometeam: 'homeTeam', homelogo: 'homeLogo', awayteam: 'awayTeam', awaylogo: 'awayLogo',
    homescore: 'homeScore', awayscore: 'awayScore', isconfirmed: 'isConfirmed', confirmedplayers: 'confirmedPlayers',
    scorers: 'goalScorers',
  },
  transactions: {
    expensetype: 'expenseType', chargedtoplayers: 'chargedToPlayers',
  },
  unpaidMembers: {},
  config: {
    adminpassword: 'adminPassword',
  },
  standings: {
    goaldifference: 'goalDifference', logotext: 'logoText',
  },
};

// Inverso: camelCase (app) → lowercase (DB) para writes
const COL_WRITE: Record<string, Record<string, string>> = {};
for (const [table, map] of Object.entries(COL_READ)) {
  const inv: Record<string, string> = {};
  for (const [lower, camel] of Object.entries(map)) inv[camel] = lower;
  COL_WRITE[table] = inv;
}

function toCamel(table: string, row: any): any {
  const map = COL_READ[table];
  if (!map) return row;
  const result: any = {};
  for (const [key, val] of Object.entries(row)) {
    const camelKey = map[key] || key;
    // scorers column might be stored as string instead of JSONB — parse it
    if (table === 'matches' && key === 'scorers' && typeof val === 'string') {
      try { result[camelKey] = JSON.parse(val); } catch { result[camelKey] = []; }
    } else {
      result[camelKey] = val;
    }
  }
  return result;
}

function toLower(table: string, row: any): any {
  const map = COL_WRITE[table];
  if (!map) return row;
  const result: any = {};
  for (const [key, val] of Object.entries(row)) {
    // Skip fields that don't exist as columns in Supabase
    if (table === 'matches' && key === 'goalkeeperId') continue;
    if (table === 'transactions' && key === 'chargePlayers') continue;
    const col = map[key] || key;
    if (table === 'matches' && key === 'goalScorers' && Array.isArray(val)) {
      result[col] = JSON.stringify(val);
    } else {
      result[col] = val;
    }
  }
  return result;
}

export async function getCollectionData<T>(tableName: string): Promise<T[]> {
  await ensureAuth();
  const { data, error } = await _client.from(tableName).select('*');
  if (error) throw error;
  return ((data || []) as any[]).map(r => toCamel(tableName, r)) as T[];
}

export function listenCollection<T>(
  tableName: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  let subscribed = false;

  const channel = _client
    .channel(`${tableName}-changes`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      async () => {
        try {
          const data = await getCollectionData<T>(tableName);
          onData(data);
        } catch (err) {
          onError?.(err as Error);
        }
      }
    )
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && !subscribed) {
        subscribed = true;
        await ensureAuth();
        getCollectionData<T>(tableName).then(onData).catch(onError);
      }
    });

  return () => {
    _client.removeChannel(channel);
  };
}

export async function saveItem<T extends { id: string }>(tableName: string, item: T): Promise<void> {
  const lowerItem = toLower(tableName, { ...item });
  await callFunction('write-data', { type: 'upsert', table: tableName, data: lowerItem });
}

export async function deleteItem(tableName: string, id: string): Promise<void> {
  await callFunction('write-data', { type: 'delete', table: tableName, id });
}

export async function saveCollectionData<T extends { id: string }>(tableName: string, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const lowerItems = items.map(i => toLower(tableName, i));
  await callFunction('write-data', { type: 'upsert-many', table: tableName, data: lowerItems });
}

export async function getDocData<T>(tableName: string, docId: string): Promise<T | null> {
  await ensureAuth();
  const { data, error } = await _client.from(tableName).select('*').eq('id', docId).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return toCamel(tableName, data) as T;
}

export async function setDocData(tableName: string, docId: string, data: Record<string, any>): Promise<void> {
  const lowerData = { id: docId, ...toLower(tableName, data) };
  await callFunction('write-data', { type: 'upsert', table: tableName, data: lowerData });
}

// Edge Functions
const EDGE_FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`;

export async function callFunction<T = any>(
  functionName: string,
  body: Record<string, any>
): Promise<T> {
  await ensureAuth();
  const { data: { session } } = await _client.auth.getSession();
  const token = session?.access_token || supabaseAnonKey;

  const res = await fetch(`${EDGE_FUNCTIONS_BASE}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apiKey': supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown_error' }));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Session refresh (picks up updated user_metadata after login)
export async function refreshSession(): Promise<void> {
  try {
    const { data: { session } } = await _client.auth.getSession();
    if (session?.refresh_token) {
      await _client.auth.refreshSession({ refresh_token: session.refresh_token });
    }
  } catch {
    // Non-critical
  }
}

// Config helpers
const STATS_START_KEY = 'unidos_stats_start_date';
const DEFAULT_STATS_START = '04/07/2026';

export function getStatsStartDate(): string {
  if (typeof window === 'undefined') return DEFAULT_STATS_START;
  try {
    return localStorage.getItem(STATS_START_KEY) || DEFAULT_STATS_START;
  } catch { return DEFAULT_STATS_START; }
}

export function setStatsStartDate(date: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STATS_START_KEY, date); } catch {}
}
