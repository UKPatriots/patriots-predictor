import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

function checkPassword(request) {
  const provided = request.headers.get("x-admin-password");
  return provided && provided === process.env.ADMIN_PASSWORD;
}

// Resolve a question: set the real correct answer, then grade every guess
// using the question's own scoring scale (points_exact / points_close / tolerance).
export async function POST(request) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { questionId, correctAnswer } = await request.json();
  if (!questionId || correctAnswer == null) {
    return NextResponse.json({ error: "questionId and correctAnswer are required" }, { status: 400 });
  }

  const { data: question, error: qErr } = await supabaseAdmin
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .single();

  if (qErr || !question) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  const { data: answers } = await supabaseAdmin
    .from("answers")
    .select("id, answer_value")
    .eq("question_id", questionId);

  let graded = 0;
  for (const a of answers || []) {
    const diff = Math.abs(Number(a.answer_value) - Number(correctAnswer));
    let points = 0;
    if (diff === 0) points = question.points_exact;
    else if (diff <= question.tolerance) points = question.points_close;

    await supabaseAdmin.from("answers").update({ points_earned: points }).eq("id", a.id);
    graded += 1;
  }

  await supabaseAdmin
    .from("questions")
    .update({ resolved: true, correct_answer: correctAnswer })
    .eq("id", questionId);

  return NextResponse.json({ graded });
}
