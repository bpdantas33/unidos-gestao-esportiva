import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface AuthRequest {
  type: 'admin_master' | 'pin';
  credential: string;
  playerId?: string;
}

interface AuthResponse {
  valid: boolean;
  role?: 'admin' | 'player';
  playerId?: string;
  isAdmin?: boolean;
  isBoardMember?: boolean;
  mustChangePin?: boolean;
  error?: string;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function setAdminMetadata(ctx: any): Promise<void> {
  try {
    if (ctx.auth?.uid) {
      await ctx.supabaseAdmin.auth.admin.updateUserById(ctx.auth.uid, {
        user_metadata: { role: 'admin' },
      });
    }
  } catch {
    // Non-critical — if metadata update fails, login still works
  }
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    try {
      const body: AuthRequest = await req.json();

      if (body.type === 'admin_master') {
        const { data, error } = await ctx.supabaseAdmin
          .from('config')
          .select('adminpassword')
          .eq('id', 'app')
          .single();

        if (error || !data) {
          return Response.json({ valid: false, error: 'config_not_found' } as AuthResponse, { status: 401 });
        }

        const hashedInput = await sha256(body.credential);

        if (data.adminpassword !== hashedInput) {
          return Response.json({ valid: false, error: 'invalid_admin_password' } as AuthResponse, { status: 401 });
        }

        await setAdminMetadata(ctx);

        return Response.json({
          valid: true,
          role: 'admin',
          isAdmin: true,
        } as AuthResponse);
      }

      if (body.type === 'pin') {
        if (!body.playerId) {
          return Response.json({ valid: false, error: 'playerId_required' } as AuthResponse, { status: 400 });
        }

        const { data, error } = await ctx.supabaseAdmin
          .from('players')
          .select('pin, isboardmember, mustchangepin, name')
          .eq('id', body.playerId)
          .single();

        if (error || !data) {
          return Response.json({ valid: false, error: 'player_not_found' } as AuthResponse, { status: 404 });
        }

        const hashedInput = await sha256(body.credential);

        if (data.pin !== hashedInput) {
          return Response.json({ valid: false, error: 'invalid_pin' } as AuthResponse, { status: 401 });
        }

        if (data.isboardmember) {
          await setAdminMetadata(ctx);
        }

        return Response.json({
          valid: true,
          role: data.isboardmember ? 'admin' : 'player',
          playerId: body.playerId,
          isBoardMember: data.isboardmember,
          mustChangePin: data.mustchangepin || false,
        } as AuthResponse);
      }

      return Response.json({ valid: false, error: 'invalid_type' } as AuthResponse, { status: 400 });
    } catch (e) {
      console.error('[validate-auth] Error:', e);
      return Response.json({ valid: false, error: 'internal_error' } as AuthResponse, { status: 500 });
    }
  }),
};