import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface ChangePinRequest {
  playerId: string;
  currentPin: string;
  newPin: string;
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
      const body: ChangePinRequest = await req.json();

      if (!body.playerId || !body.newPin) {
        return Response.json({ success: false, error: 'missing_fields' }, { status: 400 });
      }

      if (body.newPin.length < 4) {
        return Response.json({ success: false, error: 'pin_too_short' }, { status: 400 });
      }

      const { data: player, error: playerError } = await ctx.supabaseAdmin
        .from('players')
        .select('pin, name')
        .eq('id', body.playerId)
        .single();

      if (playerError || !player) {
        return Response.json({ success: false, error: 'player_not_found' }, { status: 404 });
      }

      if (player.pin) {
        const hashedCurrent = await sha256(body.currentPin);
        if (hashedCurrent !== player.pin) {
          return Response.json({ success: false, error: 'invalid_current_pin' }, { status: 401 });
        }
      }

      const hashedNew = await sha256(body.newPin);

      const { error: updateError } = await ctx.supabaseAdmin
        .from('players')
        .update({ pin: hashedNew, mustchangepin: false })
        .eq('id', body.playerId);

      if (updateError) {
        console.error('[change-pin] Update error:', updateError);
        return Response.json({ success: false, error: 'update_failed' }, { status: 500 });
      }

      return Response.json({ success: true });
    } catch (e) {
      console.error('[change-pin] Error:', e);
      return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
    }
  }),
};