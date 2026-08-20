import { supabaseAdmin } from "./supabaseAdmin";

// Looks up who a session token belongs to. Returns the player row, or null
// if the token is missing/invalid.
export async function getPlayerFromToken(token) {
  if (!token) return null;
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("player_id")
    .eq("token", token)
    .maybeSingle();
  if (!session) return null;

  const { data: player } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("id", session.player_id)
    .maybeSingle();
  return player || null;
}
