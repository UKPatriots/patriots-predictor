import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getPlayerFromToken } from "../../../lib/session";

export async function POST(request) {
  const { token, gameId, pick } = await request.json();

  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  if (!gameId || !["NE", "OPP"].includes(pick)) {
    return NextResponse.json({ error: "Invalid pick." }, { status: 400 });
  }

  const { data: game } = await supabaseAdmin.from("games").select("game_time").eq("id", gameId).maybeSingle();
  if (!game) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (new Date(game.game_time) <= new Date()) {
    return NextResponse.json({ error: "This game has already started -- picks are locked." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("picks")
    .upsert({ player_id: player.id, game_id: gameId, pick }, { onConflict: "player_id,game_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not save your pick." }, { status: 500 });
  return NextResponse.json(data);
}
