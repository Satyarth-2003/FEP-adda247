import { NextResponse } from "next/server";
import { ScanCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { extractYouTubeId } from "@/lib/utils";
import type { Video } from "@/types";

const SUPADATA_KEY = process.env.SUPADATA_API_KEY ?? "";
const SUPADATA_VIDEO = "https://api.supadata.ai/v1/youtube/video";
const SUPADATA_CHANNEL = "https://api.supadata.ai/v1/youtube/channel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET — called by Vercel Cron every hour (secured by CRON_SECRET)
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}

// POST — also callable manually
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}

interface VideoStat { views: number; likes: number; channelId: string; duration: number }

async function fetchVideoStat(ytId: string): Promise<VideoStat | null> {
  try {
    const res = await fetch(`${SUPADATA_VIDEO}?id=${ytId}`, {
      headers: { "x-api-key": SUPADATA_KEY },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      views: Number(d.viewCount ?? 0),
      likes: Number(d.likeCount ?? 0),
      channelId: d.channel?.id ?? "",
      duration: Number(d.duration ?? 0),
    };
  } catch {
    return null;
  }
}

async function fetchChannelSubs(channelId: string): Promise<number> {
  try {
    const res = await fetch(`${SUPADATA_CHANNEL}?id=${channelId}`, {
      headers: { "x-api-key": SUPADATA_KEY },
    });
    if (!res.ok) return 0;
    const d = await res.json();
    return Number(d.subscriberCount ?? 0);
  } catch {
    return 0;
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function runSync() {
  const startedAt = new Date().toISOString();
  console.log(`[YT Sync] Starting via Supadata at ${startedAt}`);

  try {
    // 1. Load all videos
    const videosRes = await ddb.send(new ScanCommand({ TableName: TABLES.VIDEOS }));
    const videos = (videosRes.Items ?? []) as Video[];
    console.log(`[YT Sync] ${videos.length} total videos`);

    // 2. Unique YouTube IDs
    const ytIdSet = new Set<string>();
    for (const v of videos) {
      const id = extractYouTubeId(v.youtubeUrl);
      if (id) ytIdSet.add(id);
    }
    const ytIds = Array.from(ytIdSet);
    console.log(`[YT Sync] ${ytIds.length} unique YouTube IDs`);

    // 3. Fetch video stats (concurrency 5)
    const statsMap = new Map<string, VideoStat>();
    const CONCURRENCY = 5;
    for (let i = 0; i < ytIds.length; i += CONCURRENCY) {
      const batch = ytIds.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(id => fetchVideoStat(id)));
      results.forEach((r, j) => { if (r) statsMap.set(batch[j], r); });
      if (i + CONCURRENCY < ytIds.length) await new Promise(r => setTimeout(r, 300));
    }
    console.log(`[YT Sync] Got stats for ${statsMap.size}/${ytIds.length} videos`);

    // 4. Channel subscriber counts
    const channelIds = [...new Set([...statsMap.values()].map(s => s.channelId).filter(Boolean))];
    const channelSubsMap = new Map<string, number>();
    for (let i = 0; i < channelIds.length; i += CONCURRENCY) {
      const batch = channelIds.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(id => fetchChannelSubs(id)));
      results.forEach((subs, j) => channelSubsMap.set(batch[j], subs));
      if (i + CONCURRENCY < channelIds.length) await new Promise(r => setTimeout(r, 300));
    }

    // 5. Group by faculty
    const byFaculty = new Map<string, Video[]>();
    for (const v of videos) {
      if (!byFaculty.has(v.facultyId)) byFaculty.set(v.facultyId, []);
      byFaculty.get(v.facultyId)!.push(v);
    }

    // 6. Write per-faculty aggregates + update individual videos
    const syncedAt = new Date().toISOString();
    let facultiesSynced = 0;
    let videosUpdated = 0;

    for (const [facultyId, fVideos] of byFaculty) {
      let totalViews = 0;
      let totalLikes = 0;
      let channelId = "";

      for (const v of fVideos) {
        const ytId = extractYouTubeId(v.youtubeUrl);
        if (!ytId) continue;
        const s = statsMap.get(ytId);
        if (!s) continue;

        totalViews += s.views;
        totalLikes += s.likes;
        if (!channelId && s.channelId) channelId = s.channelId;

        // Update individual video record
        const newDur = s.duration ? formatDuration(s.duration) : v.duration;
        if (v.views !== s.views || v.likes !== s.likes || (!v.duration && newDur)) {
          ddb.send(new UpdateCommand({
            TableName: TABLES.VIDEOS,
            Key: { facultyId: v.facultyId, videoId: v.videoId },
            UpdateExpression: "SET #views = :v, likes = :l, #dur = :d",
            ExpressionAttributeNames: { "#views": "views", "#dur": "duration" },
            ExpressionAttributeValues: { ":v": s.views, ":l": s.likes, ":d": newDur },
          })).catch(e => console.error(`[YT Sync] video update failed ${v.videoId}:`, e));
          videosUpdated++;
        }
      }

      const subscribers = channelId ? (channelSubsMap.get(channelId) ?? 0) : 0;

      await ddb.send(new PutCommand({
        TableName: TABLES.YT_STATS,
        Item: { facultyId, totalViews, totalLikes, subscribers, channelId, syncedAt },
      }));
      facultiesSynced++;
    }

    console.log(`[YT Sync] Done. ${facultiesSynced} faculties, ${videosUpdated} videos updated.`);
    return NextResponse.json({
      ok: true, syncedAt,
      totalVideos: videos.length, uniqueYtIds: ytIds.length,
      facultiesSynced, videosUpdated,
    });
  } catch (err) {
    console.error("[YT Sync] Fatal:", err);
    return NextResponse.json({ error: "Sync failed", details: String(err) }, { status: 500 });
  }
}
