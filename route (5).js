import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// One combined "enter" flow: if the name is new, it registers them with
// that PIN. If the name already exists, it checks the PIN matches.
export async function POST(request) {
  const { name, pin } = await request.json();

  const cleanName = (name || "").trim();
  const cleanPin = (pin || "").trim();

  if (!cleanName || cleanName.length < 2) {
    return NextResponse.json({ error: "Please enter a name (at least 2 characters)." }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return NextResponse.json({ error: "PIN must be 4-6 digits." }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("players")
    .select("*")
    .ilike("name", cleanName)
    .maybeSingle();

  let player = existing;

  if (existing) {
    const ok = await bcrypt.compare(cleanPin, existing.pin_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "That name is taken and the PIN doesn't match. Try a different name, or double check your PIN." },
        { status: 401 }
      );
    }
  } else {
    const pin_hash = await bcrypt.hash(cleanPin, 10);
    const { data: created, error } = await supabaseAdmin
      .from("players")
      .insert({ name: cleanName, pin_hash })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Could not create your account. Try a different name." }, { status: 500 });
    }
    player = created;
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .insert({ player_id: player.id })
    .select()
    .single();

  if (sessionError) {
    return NextResponse.json({ error: "Something went wrong signing you in." }, { status: 500 });
  }

  return NextResponse.json({ token: session.token, playerId: player.id, name: player.name });
}
