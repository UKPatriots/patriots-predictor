"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({
    prompt: "",
    deadline: "",
    points_exact: 3,
    points_close: 1,
    tolerance: 0,
  });
  const [resolveInputs, setResolveInputs] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_password");
    if (saved) {
      setPassword(saved);
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (unlocked) loadQuestions();
  }, [unlocked]);

  async function tryUnlock(e) {
    e.preventDefault();
    const res = await fetch("/api/admin/questions", {
      headers: { "x-admin-password": password },
    });
    if (res.ok) {
      sessionStorage.setItem("admin_password", password);
      setUnlocked(true);
    } else {
      setMessage("Wrong password");
    }
  }

  async function loadQuestions() {
    const res = await fetch("/api/admin/questions", {
      headers: { "x-admin-password": password },
    });
    if (res.ok) setQuestions(await res.json());
  }

  async function createQuestion(e) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ prompt: "", deadline: "", points_exact: 3, points_close: 1, tolerance: 0 });
      loadQuestions();
      setMessage("Question created!");
    } else {
      setMessage("Something went wrong creating the question.");
    }
  }

  async function resolveQuestion(id) {
    const correctAnswer = resolveInputs[id];
    if (correctAnswer == null || correctAnswer === "") return;
    const res = await fetch("/api/admin/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ questionId: id, correctAnswer }),
    });
    if (res.ok) {
      const result = await res.json();
      setMessage(`Graded ${result.graded} answers.`);
      loadQuestions();
    } else {
      setMessage("Something went wrong resolving the question.");
    }
  }

  if (!unlocked) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Admin</h2>
        <form className="auth-box" onSubmit={tryUnlock}>
          <input
            type="text"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Unlock</button>
        </form>
        {message && <p className="muted">{message}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create a new question</h2>
        <form onSubmit={createQuestion} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            placeholder="e.g. How many sacks will the Patriots have this season?"
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            required
          />
          <label className="muted">
            Guesses lock at:
            <br />
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              required
            />
          </label>
          <label className="muted">
            Points for an exact correct guess:
            <br />
            <input
              type="number"
              value={form.points_exact}
              onChange={(e) => setForm({ ...form, points_exact: Number(e.target.value) })}
            />
          </label>
          <label className="muted">
            Points for a "close" guess:
            <br />
            <input
              type="number"
              value={form.points_close}
              onChange={(e) => setForm({ ...form, points_close: Number(e.target.value) })}
            />
          </label>
          <label className="muted">
            How close counts as "close" (e.g. 2 = within 2 of the real number):
            <br />
            <input
              type="number"
              value={form.tolerance}
              onChange={(e) => setForm({ ...form, tolerance: Number(e.target.value) })}
            />
          </label>
          <button type="submit" style={{ alignSelf: "flex-start" }}>
            Create question
          </button>
        </form>
      </div>

      {message && <p className="muted">{message}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>All questions</h2>
        {questions.length === 0 && <p className="muted">None yet.</p>}
        {questions.map((q) => (
          <div key={q.id} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 700 }}>{q.prompt}</div>
            <div className="muted">
              Locks {new Date(q.deadline).toLocaleString()} · {q.points_exact}pt exact / {q.points_close}pt within {q.tolerance}
            </div>
            {q.resolved ? (
              <div className="muted">✅ Resolved — correct answer was {q.correct_answer}</div>
            ) : (
              <div className="auth-box" style={{ marginTop: 8 }}>
                <input
                  type="number"
                  placeholder="Enter real result"
                  value={resolveInputs[q.id] ?? ""}
                  onChange={(e) => setResolveInputs({ ...resolveInputs, [q.id]: e.target.value })}
                />
                <button onClick={() => resolveQuestion(q.id)}>Resolve & grade</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
