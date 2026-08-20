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
    // Pull all graded picks and graded season-question answers, plus display names
    const [{ data: picks }, { data: answers }, { data: players }] = await Promise.all([
      supabase.from("picks").select("player_id, correct").not("correct", "is", null),
      supabase.from("answers").select("player_id, points_earned").not("points_earned", "is", null),
      supabase.from("players").select("id, name"),
    ]);

    const nameMap = {};
    (players || []).forEach((p) => (nameMap[p.id] = p.name));

    const tally = {};
    function ensure(playerId) {
      if (!tally[playerId]) tally[playerId] = { gamePoints: 0, gamesTotal: 0, questionPoints: 0 };
      return tally[playerId];
    }

    (picks || []).forEach((p) => {
      const t = ensure(p.player_id);
      t.gamesTotal += 1;
      if (p.correct) t.gamePoints += 1;
    });

    (answers || []).forEach((a) => {
      const t = ensure(a.player_id);
      t.questionPoints += a.points_earned || 0;
    });

    const result = Object.entries(tally)
      .map(([playerId, stats]) => ({
        name: nameMap[playerId] || "Unknown",
        totalPoints: stats.gamePoints + stats.questionPoints,
        ...stats,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

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
              <th>Total pts</th>
              <th>Game picks correct</th>
              <th>Season Q points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>{r.totalPoints}</td>
                <td>{r.gamePoints} / {r.gamesTotal}</td>
                <td>{r.questionPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
