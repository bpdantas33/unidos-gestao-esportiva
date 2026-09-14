import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface WriteRequest {
  type: 'upsert' | 'delete' | 'upsert-many';
  table: string;
  data?: any;
  id?: string;
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    try {
      const hasJwt = !!req.headers.get('Authorization')?.startsWith('Bearer ');
      if (!hasJwt) {
        return Response.json({ error: 'unauthorized', reason: 'no_jwt' }, { status: 401 });
      }
      const body: WriteRequest = await req.json();
      const admin = ctx.supabaseAdmin;

      if (body.type === 'upsert') {
        const { error } = await admin.from(body.table).upsert(body.data).select();
        if (error) throw error;
        return Response.json({ success: true });
      }

      if (body.type === 'delete') {
        if (!body.id) {
          return Response.json({ error: 'id_required' }, { status: 400 });
        }
        const { error } = await admin.from(body.table).delete().eq('id', body.id);
        if (error) throw error;
        return Response.json({ success: true });
      }

      if (body.type === 'upsert-many') {
        if (!body.data || !Array.isArray(body.data) || body.data.length === 0) {
          return Response.json({ error: 'data_array_required' }, { status: 400 });
        }
        const { error } = await admin.from(body.table).upsert(body.data).select();
        if (error) throw error;
        return Response.json({ success: true });
      }

      return Response.json({ error: 'invalid_type' }, { status: 400 });
    } catch (e) {
      console.error('[write-data] Error:', e);
      return Response.json({ error: 'internal_error', detail: (e as Error).message }, { status: 500 });
    }
  }),
};
