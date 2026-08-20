import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getPlayerFromToken } from "../../../lib/session";

export async function POST(request) {
  const { token, questionId, answerValue } = await request.json();

  const player = await getPlayerFromToken(token);
  if (!player) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  if (!questionId || answerValue === undefined || answerValue === "") {
    return NextResponse.json({ error: "Invalid answer." }, { status: 400 });
  }

  const { data: question } = await supabaseAdmin
    .from("questions")
    .select("deadline, resolved")
    .eq("id", questionId)
    .maybeSingle();
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  if (question.resolved || new Date(question.deadline) <= new Date()) {
    return NextResponse.json({ error: "This question is locked." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("answers")
    .upsert(
      { player_id: player.id, question_id: questionId, answer_value: Number(answerValue) },
      { onConflict: "player_id,question_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not save your answer." }, { status: 500 });
  return NextResponse.json(data);
}
