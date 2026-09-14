import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface ConfirmRequest {
  matchId: string;
  playerId: string;
  status: 'CONFIRMADO' | 'AUSENTE';
}

interface ConfirmationsMap {
  [matchId: string]: Record<string, 'CONFIRMADO' | 'AUSENTE'>;
}

function normalizeResponses(data: unknown): Record<string, 'CONFIRMADO' | 'AUSENTE'> {
  if (!data) return {};
  if (Array.isArray(data)) {
    const record: Record<string, 'CONFIRMADO' | 'AUSENTE'> = {};
    data.forEach(id => { record[id] = 'CONFIRMADO'; });
    return record;
  }
  return data as Record<string, 'CONFIRMADO' | 'AUSENTE'>;
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    try {
      const hasJwt = !!req.headers.get('Authorization')?.startsWith('Bearer ');
      if (!hasJwt) {
        return Response.json({ error: 'unauthorized', reason: 'no_jwt' }, { status: 401 });
      }
      const body: ConfirmRequest = await req.json();
      const { matchId, playerId, status } = body;

      if (!matchId || !playerId || !status) {
        return Response.json({ error: 'missing_fields' }, { status: 400 });
      }

      const admin = ctx.supabaseAdmin;

      const { data: row, error: readError } = await admin
        .from('confirmations')
        .select('data')
        .eq('id', 'singleton')
        .single();

      if (readError && readError.code !== 'PGRST116') {
        throw readError;
      }

      const rawMap: Record<string, unknown> = (row as any)?.data || {};
      const currentMap: ConfirmationsMap = {};
      for (const [key, value] of Object.entries(rawMap)) {
        currentMap[key] = normalizeResponses(value);
      }

      const responses = { ...(currentMap[matchId] || {}) };
      responses[playerId] = status;
      currentMap[matchId] = responses;

      const { error: upsertError } = await admin
        .from('confirmations')
        .upsert({ id: 'singleton', data: currentMap });

      if (upsertError) throw upsertError;

      return Response.json({ success: true, data: currentMap });
    } catch (e) {
      console.error('[confirm-attendance] Error:', e);
      return Response.json({ error: 'internal_error', detail: (e as Error).message }, { status: 500 });
    }
  }),
};
