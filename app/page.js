"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [games, setGames] = useState([]);
  const [myPicks, setMyPicks] = useState({}); // game_id -> {pick, correct}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (session) {
      checkProfile();
      loadMyPicks();
    }
  }, [session]);

  async function loadGames() {
    const { data } = await supabase
      .from("games")
      .select("*")
      .order("game_time", { ascending: true });
    setGames(data || []);
    setLoading(false);
  }

  async function checkProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (!data) setNeedsName(true);
  }

  async function saveName() {
    if (!displayName.trim()) return;
    await supabase.from("profiles").upsert({
      id: session.user.id,
      display_name: displayName.trim(),
    });
    setNeedsName(false);
  }

  async function loadMyPicks() {
    const { data } = await supabase
      .from("picks")
      .select("*")
      .eq("user_id", session.user.id);
    const map = {};
    (data || []).forEach((p) => (map[p.game_id] = p));
    setMyPicks(map);
  }

  async function sendMagicLink(e) {
    e.preventDefault();
    await supabase.auth.signInWithOtp({ email });
    setLinkSent(true);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function makePick(gameId, pick) {
    if (!session) return;
    const { data, error } = await supabase
      .from("picks")
      .upsert(
        { user_id: session.user.id, game_id: gameId, pick },
        { onConflict: "user_id,game_id" }
      )
      .select()
      .single();
    if (!error) {
      setMyPicks((prev) => ({ ...prev, [gameId]: data }));
    }
  }

  const now = new Date();

  return (
    <div>
      <div className="card">
        {!session ? (
          linkSent ? (
            <p>Check your email for a sign-in link ✉️</p>
          ) : (
            <form className="auth-box" onSubmit={sendMagicLink}>
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit">Sign in to make picks</button>
            </form>
          )
        ) : needsName ? (
          <div className="auth-box">
            <input
              type="text"
              placeholder="Pick a display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <button onClick={saveName}>Save</button>
          </div>
        ) : (
          <div className="auth-box" style={{ justifyContent: "space-between" }}>
            <span>Signed in as {session.user.email}</span>
            <button onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>

      {loading && <p className="muted">Loading games…</p>}
      {!loading && games.length === 0 && (
        <p className="muted">
          No games loaded yet. Once the season schedule syncs, games will appear here.
        </p>
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
                {isFinal
                  ? `FINAL ${g.patriots_score}-${g.opponent_score}`
                  : started
                  ? "IN PROGRESS"
                  : "UPCOMING"}
              </span>
            </div>

            <div className="pick-buttons" style={{ marginTop: 12 }}>
              {["NE", "OPP"].map((choice) => {
                let cls = "";
                if (myPick?.pick === choice) cls = "selected";
                if (isFinal && myPick?.pick === choice) {
                  cls = myPick.correct ? "correct" : "incorrect";
                }
                return (
                  <button
                    key={choice}
                    className={cls}
                    disabled={!session || started}
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
