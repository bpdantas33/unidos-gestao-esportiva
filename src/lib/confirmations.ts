import { getClient, setDocData, getDocData, callFunction } from './supabase';

export type ConfirmationsMap = Record<string, Record<string, 'CONFIRMADO' | 'AUSENTE'>>;

/** Normaliza dados legados: se for array (formato antigo), converte para Record */
export function normalizeResponses(data: unknown): Record<string, 'CONFIRMADO' | 'AUSENTE'> {
  if (!data) return {};
  if (Array.isArray(data)) {
    const record: Record<string, 'CONFIRMADO' | 'AUSENTE'> = {};
    data.forEach(id => { record[id] = 'CONFIRMADO'; });
    return record;
  }
  return data as Record<string, 'CONFIRMADO' | 'AUSENTE'>;
}

export function normalizeConfirmationsMap(map: Record<string, unknown>): ConfirmationsMap {
  const result: ConfirmationsMap = {};
  for (const [matchId, value] of Object.entries(map)) {
    result[matchId] = normalizeResponses(value);
  }
  return result;
}

const TABLE = 'confirmations';
const ROW_ID = 'singleton';

export function listenConfirmations(
  onData: (confirmations: ConfirmationsMap) => void,
  onError?: (err: Error) => void
): () => void {
  let subscribed = false;

  const channel = getClient()
    .channel('confirmations-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      async () => {
        try {
          const row = await getDocData<{ id: string; data: Record<string, unknown> }>(TABLE, ROW_ID);
          onData(normalizeConfirmationsMap(row?.data || {}));
        } catch (err) {
          onError?.(err as Error);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED' && !subscribed) {
        subscribed = true;
        getDocData<{ id: string; data: Record<string, unknown> }>(TABLE, ROW_ID)
          .then(row => onData(normalizeConfirmationsMap(row?.data || {})))
          .catch(() => onData({}));
      }
    });

  return () => {
    getClient().removeChannel(channel);
  };
}

export async function updateConfirmation(
  matchId: string,
  playerId: string,
  status: 'CONFIRMADO' | 'AUSENTE',
): Promise<ConfirmationsMap> {
  const result = await callFunction<{ success: boolean; data: Record<string, unknown> }>('confirm-attendance', {
    matchId,
    playerId,
    status,
  });
  return normalizeConfirmationsMap(result.data);
}

export async function removeMatchConfirmations(
  matchId: string,
  currentMap: ConfirmationsMap
): Promise<void> {
  if (!(matchId in currentMap)) return;
  const { [matchId]: _, ...rest } = currentMap;
  await setDocData(TABLE, ROW_ID, { data: rest });
}

const MIGRATED_FLAG = 'unidos_confirmations_migrated';

export async function migrateConfirmationsIfNeeded(
  matches: Array<{ id: string; confirmedPlayers?: string[] }>
): Promise<void> {
  if (localStorage.getItem(MIGRATED_FLAG)) return;

  try {
    const existing = await getDocData<{ id: string; data: ConfirmationsMap }>(TABLE, ROW_ID);
    if (existing) {
      localStorage.setItem(MIGRATED_FLAG, 'true');
      return;
    }
  } catch {
    // Tabela pode não existir ainda — continua
  }

  const confirmationsMap: ConfirmationsMap = {};
  for (const match of matches) {
    if (match.confirmedPlayers && match.confirmedPlayers.length > 0) {
      const record: Record<string, 'CONFIRMADO' | 'AUSENTE'> = {};
      match.confirmedPlayers.forEach(id => { record[id] = 'CONFIRMADO'; });
      confirmationsMap[match.id] = record;
    }
  }

  try {
    await setDocData(TABLE, ROW_ID, { data: confirmationsMap });
    localStorage.setItem(MIGRATED_FLAG, 'true');
    console.log('[Confirmations] Migration complete — consolidated from match docs to single doc');
  } catch (err) {
    console.warn('[Confirmations] Migration failed (likely schema not created yet):', err);
  }
}
