import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// ESPN's public (unofficial, no API key needed) scoreboard endpoint, per week.
// seasontype: 1 = preseason, 2 = regular season, 3 = postseason.
// The team-schedule endpoint doesn't reliably support filtering by season
// type, so instead we pull each week's full scoreboard and pick out
// whichever game the Patriots played, if any.
function scoreboardUrl(seasontype, week) {
  return `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=${seasontype}&week=${week}`;
}

const WEEKS_TO_CHECK = [
  ...[1, 2, 3, 4].map((week) => ({ seasontype: 1, week })), // preseason
  ...Array.from({ length: 18 }, (_, i) => ({ seasontype: 2, week: i + 1 })), // regular season
  ...[1, 2, 3, 4, 5].map((week) => ({ seasontype: 3, week })), // postseason
];

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const events = [];
  const fetchErrors = [];

  await Promise.all(
    WEEKS_TO_CHECK.map(async ({ seasontype, week }) => {
      try {
        const res = await fetch(scoreboardUrl(seasontype, week), { cache: "no-store" });
        const data = await res.json();
        for (const event of data.events || []) {
          const competitors = event.competitions?.[0]?.competitors || [];
          const hasPatriots = competitors.some((c) => c.team?.abbreviation === "NE");
          if (hasPatriots) events.push(event);
        }
      } catch (err) {
        fetchErrors.push(`seasontype ${seasontype} week ${week}: ${String(err)}`);
      }
    })
  );

  const summary = { synced: 0, newlyGraded: [], fetchErrors };

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

    const { data: existing } = await supabaseAdmin
      .from("games")
      .select("status")
      .eq("id", gameRow.id)
      .maybeSingle();

    const wasAlreadyFinal = existing?.status === "final";

    await supabaseAdmin.from("games").upsert(gameRow);
    summary.synced += 1;

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
