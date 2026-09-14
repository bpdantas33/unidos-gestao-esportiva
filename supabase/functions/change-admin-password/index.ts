import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface ChangeAdminPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    try {
      const body: ChangeAdminPasswordRequest = await req.json();
      const { currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        return Response.json({ success: false, error: 'missing_fields' }, { status: 400 });
      }

      const { data: config, error: configError } = await ctx.supabaseAdmin
        .from('config')
        .select('adminpassword')
        .eq('id', 'app')
        .single();

      if (configError || !config) {
        return Response.json({ success: false, error: 'config_not_found' }, { status: 404 });
      }

      const hashedCurrent = await sha256(currentPassword);
      if (config.adminpassword !== hashedCurrent) {
        return Response.json({ success: false, error: 'invalid_current_password' }, { status: 401 });
      }

      const hashedNew = await sha256(newPassword);

      const { error: updateError } = await ctx.supabaseAdmin
        .from('config')
        .update({ adminpassword: hashedNew })
        .eq('id', 'app');

      if (updateError) {
        return Response.json({ success: false, error: 'update_failed' }, { status: 500 });
      }

      return Response.json({ success: true });
    } catch (e) {
      console.error('[change-admin-password] Error:', e);
      return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
    }
  }),
};