import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const ADJUST_API_TOKEN = process.env.ADJUST_API_TOKEN || "";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "fep_manager" && user.role !== "fep_admin")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const trackerTokens = searchParams.get("trackers")?.split(",") ?? [];

  if (trackerTokens.length === 0) {
    return NextResponse.json({ error: "No tracker tokens provided" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      dimensions: "tracker",
      metrics: "installs,clicks,impressions,sessions,reattributions,daus,waus,maus",
      date_period: "-30d:-1d",
      tracker_token__in: trackerTokens.join(","),
    });

    const res = await fetch(
      `https://dash.adjust.com/control-center/reports-service/report?${params.toString()}`,
      {
        headers: {
          "Authorization": `Bearer ${ADJUST_API_TOKEN}`,
          "Accept": "application/json",
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Adjust API error:", res.status, errText);
      return NextResponse.json({
        trackers: trackerTokens.map(t => ({ token: t, installs: 0, clicks: 0, impressions: 0, sessions: 0, reattributions: 0, daus: 0 })),
        error: "Adjust API unavailable - showing placeholder data",
      });
    }

    const data = await res.json();
    const rows = data.rows ?? [];
    const trackerMap: Record<string, { installs: number; clicks: number; impressions: number; sessions: number; reattributions: number; daus: number }> = {};
    
    for (const row of rows) {
      const token = row.tracker_token || row.tracker;
      if (token) {
        trackerMap[token] = {
          installs: Number(row.installs || 0),
          clicks: Number(row.clicks || 0),
          impressions: Number(row.impressions || 0),
          sessions: Number(row.sessions || 0),
          reattributions: Number(row.reattributions || 0),
          daus: Number(row.daus || 0),
        };
      }
    }

    return NextResponse.json({
      trackers: trackerTokens.map(t => ({
        token: t,
        installs: trackerMap[t]?.installs ?? 0,
        clicks: trackerMap[t]?.clicks ?? 0,
        impressions: trackerMap[t]?.impressions ?? 0,
        sessions: trackerMap[t]?.sessions ?? 0,
        reattributions: trackerMap[t]?.reattributions ?? 0,
        daus: trackerMap[t]?.daus ?? 0,
      })),
    });
  } catch (err) {
    console.error("Adjust fetch error:", err);
    return NextResponse.json({
      trackers: trackerTokens.map(t => ({ token: t, installs: 0, clicks: 0, impressions: 0, sessions: 0, reattributions: 0, daus: 0 })),
      error: "Failed to fetch from Adjust",
    });
  }
}
