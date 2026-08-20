import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

function checkPassword(request) {
  const provided = request.headers.get("x-admin-password");
  return provided && provided === process.env.ADMIN_PASSWORD;
}

// Create a new question
export async function POST(request) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { prompt, deadline, points_exact, points_close, tolerance } = body;

  if (!prompt || !deadline) {
    return NextResponse.json({ error: "prompt and deadline are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("questions")
    .insert({
      prompt,
      deadline,
      points_exact: points_exact ?? 3,
      points_close: points_close ?? 1,
      tolerance: tolerance ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// List all questions (admin view, includes unresolved and resolved)
export async function GET(request) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
