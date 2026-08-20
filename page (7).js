"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function QuestionsPage() {
  const [player, setPlayer] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [myAnswers, setMyAnswers] = useState({});
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("player");
    if (saved) setPlayer(JSON.parse(saved));
    loadQuestions();
  }, []);

  useEffect(() => {
    if (player) loadMyAnswers();
  }, [player]);

  async function loadQuestions() {
    const { data } = await supabase.from("questions").select("*").order("deadline", { ascending: true });
    setQuestions(data || []);
    setLoading(false);
  }

  async function loadMyAnswers() {
    const { data } = await supabase.from("answers").select("*").eq("player_id", player.playerId);
    const map = {};
    (data || []).forEach((a) => (map[a.question_id] = a));
    setMyAnswers(map);
  }

  async function submitAnswer(questionId) {
    if (!player) return;
    const value = inputs[questionId];
    if (value === undefined || value === "") return;

    const res = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: player.token, questionId, answerValue: value }),
    });
    const data = await res.json();
    if (res.ok) setMyAnswers((prev) => ({ ...prev, [questionId]: data }));
  }

  const now = new Date();

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Season Predictions</h2>
        <p className="muted">
          Submit your best guess before each question locks. Points are awarded based on how close you are.
        </p>
        {!player && <p className="muted">Sign in on the Games page first to submit answers.</p>}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && questions.length === 0 && (
        <p className="muted">No season questions have been posted yet — check back soon.</p>
      )}

      {questions.map((q) => {
        const deadline = new Date(q.deadline);
        const locked = now >= deadline;
        const mine = myAnswers[q.id];

        return (
          <div className="card" key={q.id}>
            <div style={{ fontWeight: 700 }}>{q.prompt}</div>
            <div className="kickoff" style={{ marginBottom: 8 }}>
              {locked ? "Locked" : `Locks ${deadline.toLocaleString()}`} · worth up to {q.points_exact} pts
            </div>

            {q.resolved && (
              <div className="muted" style={{ marginBottom: 8 }}>
                ✅ Actual result: {q.correct_answer}
                {mine && ` — your guess: ${mine.answer_value} (${mine.points_earned ?? 0} pts)`}
              </div>
            )}

            {!q.resolved && (
              <div className="auth-box">
                <input
                  type="number"
                  placeholder={mine ? String(mine.answer_value) : "Your guess"}
                  disabled={!player || locked}
                  value={inputs[q.id] ?? ""}
                  onChange={(e) => setInputs({ ...inputs, [q.id]: e.target.value })}
                />
                <button disabled={!player || locked} onClick={() => submitAnswer(q.id)}>
                  {mine ? "Update guess" : "Submit guess"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
