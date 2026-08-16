"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    // Pull all graded picks along with the display name of who made them
    const { data: picks } = await supabase
      .from("picks")
      .select("user_id, correct")
      .not("correct", "is", null);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name");

    const nameMap = {};
    (profiles || []).forEach((p) => (nameMap[p.id] = p.display_name));

    const tally = {};
    (picks || []).forEach((p) => {
      if (!tally[p.user_id]) tally[p.user_id] = { correct: 0, total: 0 };
      tally[p.user_id].total += 1;
      if (p.correct) tally[p.user_id].correct += 1;
    });

    const result = Object.entries(tally)
      .map(([userId, stats]) => ({
        name: nameMap[userId] || "Anonymous",
        ...stats,
      }))
      .sort((a, b) => b.correct - a.correct);

    setRows(result);
    setLoading(false);
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
      {loading && <p className="muted">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="muted">No graded picks yet — check back after the first game finishes.</p>
      )}
      {rows.length > 0 && (
        <table className="leaderboard">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Correct</th>
              <th>Picks made</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>{r.correct}</td>
                <td>{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
