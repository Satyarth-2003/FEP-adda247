import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const ADJUST_API_TOKEN = process.env.ADJUST_API_TOKEN || "";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "eduskill_manager" && user.role !== "eduskill_admin")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const trackerTokens = searchParams.get("trackers")?.split(",") ?? [];

  if (trackerTokens.length === 0) {
    return NextResponse.json({ error: "No tracker tokens provided" }, { status: 400 });
  }

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const datePeriod = `${start.toISOString().split("T")[0]}:${end.toISOString().split("T")[0]}`;

    const params = new URLSearchParams({
      dimensions: "network",
      metrics: "installs,clicks,impressions,sessions,reattributions",
      date_period: datePeriod,
    });
    params.set("tracker_token__in", trackerTokens.join(","));

    const apiUrl = `https://dash.adjust.com/control-center/reports-service/report?${params.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${ADJUST_API_TOKEN}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Adjust API error:", response.status, errText);
      return NextResponse.json({
        trackers: trackerTokens.map(t => ({ token: t, installs: 0, clicks: 0, sessions: 0, reattributions: 0 })),
        networks: [],
        totals: { installs: 0, clicks: 0, sessions: 0, reattributions: 0 },
        error: `Adjust API error (${response.status})`,
      });
    }

    const data = await response.json();
    const rows = data.rows ?? [];
    const totals = data.totals ?? {};

    // Return raw network-level data so frontend can match by email
    const networks = rows.map((row: Record<string, unknown>) => ({
      network: row.network as string,
      installs: Number(row.installs || 0),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      sessions: Number(row.sessions || 0),
      reattributions: Number(row.reattributions || 0),
    }));

    return NextResponse.json({
      networks,
      totals: {
        installs: Number(totals.installs || 0),
        clicks: Number(totals.clicks || 0),
        impressions: Number(totals.impressions || 0),
        sessions: Number(totals.sessions || 0),
        reattributions: Number(totals.reattributions || 0),
      },
    });
  } catch (err) {
    console.error("Adjust fetch error:", err);
    return NextResponse.json({
      networks: [],
      totals: { installs: 0, clicks: 0, sessions: 0, reattributions: 0 },
      error: "Failed to fetch from Adjust",
    });
  }
}
