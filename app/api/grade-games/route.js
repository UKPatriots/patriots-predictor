import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// ESPN's public (unofficial, no API key needed) endpoint for a team's schedule.
// seasontype: 1 = preseason, 2 = regular season, 3 = postseason.
// We fetch all three so the full season shows up, not just whatever ESPN
// treats as "current" (which defaults to preseason in August).
function espnUrl(seasontype) {
  return `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/ne/schedule?season=2026&seasontype=${seasontype}`;
}

// A simple shared secret so random people on the internet can't spam this
// endpoint. Set CRON_SECRET in Vercel and pass ?secret=... when you set up
// the scheduler.
function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow if you haven't set one yet (fine for testing)
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let events = [];
  try {
    const results = await Promise.all(
      [1, 2, 3].map((seasontype) => fetch(espnUrl(seasontype), { cache: "no-store" }).then((r) => r.json()))
    );
    events = results.flatMap((data) => data.events || []);
  } catch (err) {
    return NextResponse.json({ error: "failed to fetch ESPN data", detail: String(err) }, { status: 502 });
  }

  const summary = { synced: 0, newlyGraded: [] };

  for (const event of events) {
    const competition = event.competitions?.[0];
    if (!competition) continue;

    const competitors = competition.competitors || [];
    const ne = competitors.find((c) => c.team?.abbreviation === "NE");
    const opp = competitors.find((c) => c.team?.abbreviation !== "NE");
    if (!ne || !opp) continue;

    const statusType = competition.status?.type || {};
    const isFinal = !!statusType.completed;
    const neScore = ne.score != null ? parseInt(ne.score, 10) : null;
    const oppScore = opp.score != null ? parseInt(opp.score, 10) : null;

    let winner = null;
    if (isFinal && neScore != null && oppScore != null) {
      winner = neScore > oppScore ? "NE" : "OPP";
    }

    const gameRow = {
      id: String(event.id),
      week: event.week?.number ?? null,
      opponent: opp.team?.shortDisplayName || opp.team?.name || "Opponent",
      home_away: ne.homeAway || "home",
      game_time: event.date,
      patriots_score: neScore,
      opponent_score: oppScore,
      status: isFinal ? "final" : statusType.state === "in" ? "in_progress" : "scheduled",
      winner,
    };

    // Check if this game was already marked final before this run
    const { data: existing } = await supabaseAdmin
      .from("games")
      .select("status")
      .eq("id", gameRow.id)
      .maybeSingle();

    const wasAlreadyFinal = existing?.status === "final";

    await supabaseAdmin.from("games").upsert(gameRow);
    summary.synced += 1;

    // Grade picks only the moment a game newly becomes final
    if (isFinal && !wasAlreadyFinal && winner) {
      const { data: picks } = await supabaseAdmin
        .from("picks")
        .select("id, pick")
        .eq("game_id", gameRow.id);

      for (const p of picks || []) {
        await supabaseAdmin
          .from("picks")
          .update({ correct: p.pick === winner })
          .eq("id", p.id);
      }
      summary.newlyGraded.push({ gameId: gameRow.id, winner, pickCount: picks?.length || 0 });
    }
  }

  return NextResponse.json(summary);
}

After committing, Vercel will auto-redeploy in a minute or two. Then visit https://YOUR-SITE.vercel.app/api/grade-games?secret=YOUR_CRON_SECRET once yourself to trigger an immediate sync — you should see a bigger "synced" number this time, and regular season games should appear on your homepage.

One thing worth deciding: do you want preseason games to keep showing on the site alongside regular season, or would you rather I make it only show regular season + playoffs (since preseason results don't matter much for most fans)?


