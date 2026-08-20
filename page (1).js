"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const [player, setPlayer] = useState(null); // {token, playerId, name}
  const [nameInput, setNameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [games, setGames] = useState([]);
  const [myPicks, setMyPicks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("player");
    if (saved) setPlayer(JSON.parse(saved));
    loadGames();
  }, []);

  useEffect(() => {
    if (player) loadMyPicks();
  }, [player]);

  async function loadGames() {
    const { data } = await supabase.from("games").select("*").order("game_time", { ascending: true });
    setGames(data || []);
    setLoading(false);
  }

  async function loadMyPicks() {
    const { data } = await supabase.from("picks").select("*").eq("player_id", player.playerId);
    const map = {};
    (data || []).forEach((p) => (map[p.game_id] = p));
    setMyPicks(map);
  }

  async function handleEnter(e) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/auth/enter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput, pin: pinInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || "Something went wrong.");
      return;
    }
    localStorage.setItem("player", JSON.stringify(data));
    setPlayer(data);
    setPinInput("");
  }

  function signOut() {
    localStorage.removeItem("player");
    setPlayer(null);
  }

  async function makePick(gameId, pick) {
    if (!player) return;
    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: player.token, gameId, pick }),
    });
    const data = await res.json();
    if (res.ok) setMyPicks((prev) => ({ ...prev, [gameId]: data }));
  }

  const now = new Date();

  return (
    <div>
      <div className="card">
        {!player ? (
          <form onSubmit={handleEnter} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="muted" style={{ margin: 0 }}>
              First time? Just pick a name and a 4-6 digit PIN — that creates your account. Used it before? Enter the same name and PIN to get back in.
            </p>
            <div className="auth-box">
              <input
                type="text"
                placeholder="Your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="4-6 digit PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                required
              />
              <button type="submit">Continue</button>
            </div>
            {authError && <p style={{ color: "#c60c30", margin: 0 }}>{authError}</p>}
          </form>
        ) : (
          <div className="auth-box" style={{ justifyContent: "space-between" }}>
            <span>Signed in as <strong>{player.name}</strong></span>
            <button onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>

      {loading && <p className="muted">Loading games…</p>}
      {!loading && games.length === 0 && (
        <p className="muted">No games loaded yet. Once the season schedule syncs, games will appear here.</p>
      )}

      {games.map((g) => {
        const kickoff = new Date(g.game_time);
        const started = now >= kickoff;
        const myPick = myPicks[g.id];
        const isFinal = g.status === "final";

        return (
          <div className="card" key={g.id}>
            <div className="game-row">
              <div>
                <div className="matchup">
                  Patriots {g.home_away === "home" ? "vs" : "@"} {g.opponent}
                </div>
                <div className="kickoff">
                  {kickoff.toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <span className={`status-badge ${isFinal ? "final" : ""}`}>
                {isFinal ? `FINAL ${g.patriots_score}-${g.opponent_score}` : started ? "IN PROGRESS" : "UPCOMING"}
              </span>
            </div>

            <div className="pick-buttons" style={{ marginTop: 12 }}>
              {["NE", "OPP"].map((choice) => {
                let cls = "";
                if (myPick?.pick === choice) cls = "selected";
                if (isFinal && myPick?.pick === choice) cls = myPick.correct ? "correct" : "incorrect";
                return (
                  <button
                    key={choice}
                    className={cls}
                    disabled={!player || started}
                    onClick={() => makePick(g.id, choice)}
                  >
                    {choice === "NE" ? "Patriots win" : `${g.opponent} win`}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
