import { NextResponse } from "next/server";
import { ScanCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { extractYouTubeId } from "@/lib/utils";
import type { Video } from "@/types";

const YT_API_KEY = process.env.YOUTUBE_API_KEY ?? "";

const YT_STATS_TABLE = "fep-yt-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET — called by Vercel Cron every hour (secured by CRON_SECRET)
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow if no secret set (dev) or secret matches
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runSync();
}

// POST — also callable manually (e.g. from admin panel or scripts)
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}

async function runSync() {
  const startedAt = new Date().toISOString();
  console.log(`[YT Sync] Starting at ${startedAt}`);

  try {
    // 1. Fetch all videos
    const videosRes = await ddb.send(new ScanCommand({ TableName: TABLES.VIDEOS }));
    const videos = (videosRes.Items ?? []) as Video[];
    console.log(`[YT Sync] ${videos.length} total videos`);

    // 2. Build ytId → video map (skip duplicates — pick first)
    const ytIdToVideo = new Map<string, Video>();
    for (const v of videos) {
      const ytId = extractYouTubeId(v.youtubeUrl);
      if (ytId && !ytIdToVideo.has(ytId)) {
        ytIdToVideo.set(ytId, v);
      }
    }

    const allYtIds = Array.from(ytIdToVideo.keys());
    console.log(`[YT Sync] ${allYtIds.length} unique YouTube IDs to fetch`);

    // 3. Batch-fetch YouTube stats (50 per request)
    interface YTStat { views: number; likes: number; channelId: string }
    const ytStats = new Map<string, YTStat>();
    const channelIdsSet = new Set<string>();

    for (let i = 0; i < allYtIds.length; i += 50) {
      const batch = allYtIds.slice(i, i + 50);
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${batch.join(",")}&key=${YT_API_KEY}`
        );
        if (!res.ok) {
          console.error(`[YT Sync] YT API batch ${i / 50} failed: ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const item of data.items ?? []) {
          const stats = item.statistics ?? {};
          const channelId: string = item.snippet?.channelId ?? "";
          ytStats.set(item.id, {
            views: Number(stats.viewCount ?? 0),
            likes: Number(stats.likeCount ?? 0),
            channelId,
          });
          if (channelId) channelIdsSet.add(channelId);
        }
      } catch (e) {
        console.error(`[YT Sync] Batch fetch error:`, e);
      }
    }

    // 4. Fetch channel subscriber counts
    const channelSubs = new Map<string, number>();
    const channelIds = Array.from(channelIdsSet);
    for (let i = 0; i < channelIds.length; i += 50) {
      const batch = channelIds.slice(i, i + 50);
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${batch.join(",")}&key=${YT_API_KEY}`
        );
        if (!res.ok) continue;
        const data = await res.json();
        for (const item of data.items ?? []) {
          channelSubs.set(item.id, Number(item.statistics?.subscriberCount ?? 0));
        }
      } catch (e) {
        console.error(`[YT Sync] Channel subs fetch error:`, e);
      }
    }

    // 5. Aggregate per-faculty
    // Group videos by facultyId
    const facultyVideosMap = new Map<string, Video[]>();
    for (const v of videos) {
      if (!facultyVideosMap.has(v.facultyId)) facultyVideosMap.set(v.facultyId, []);
      facultyVideosMap.get(v.facultyId)!.push(v);
    }

    // 6. Write aggregate to fep-yt-stats and update individual video stats
    const syncedAt = new Date().toISOString();
    let facultiesSynced = 0;
    let videosUpdated = 0;

    for (const [facultyId, fVideos] of facultyVideosMap) {
      let totalViews = 0;
      let totalLikes = 0;
      let channelId = "";

      for (const v of fVideos) {
        const ytId = extractYouTubeId(v.youtubeUrl);
        if (!ytId) continue;
        const live = ytStats.get(ytId);
        if (!live) continue;

        totalViews += live.views;
        totalLikes += live.likes;
        if (!channelId && live.channelId) channelId = live.channelId;

        // Update individual video in DynamoDB if out of sync
        if (v.views !== live.views || v.likes !== live.likes) {
          try {
            await ddb.send(new UpdateCommand({
              TableName: TABLES.VIDEOS,
              Key: { facultyId: v.facultyId, videoId: v.videoId },
              UpdateExpression: "SET #views = :v, likes = :l",
              ExpressionAttributeNames: { "#views": "views" },
              ExpressionAttributeValues: { ":v": live.views, ":l": live.likes },
            }));
            videosUpdated++;
          } catch (e) {
            console.error(`[YT Sync] Failed to update video ${v.videoId}:`, e);
          }
        }
      }

      const subscribers = channelId ? (channelSubs.get(channelId) ?? 0) : 0;

      // Write to fep-yt-stats cache table
      try {
        await ddb.send(new PutCommand({
          TableName: YT_STATS_TABLE,
          Item: {
            facultyId,
            totalViews,
            totalLikes,
            subscribers,
            channelId,
            syncedAt,
          },
        }));
        facultiesSynced++;
      } catch (e) {
        console.error(`[YT Sync] Failed to write yt-stats for ${facultyId}:`, e);
      }
    }

    console.log(`[YT Sync] Done. ${facultiesSynced} faculties synced, ${videosUpdated} videos updated.`);

    return NextResponse.json({
      ok: true,
      syncedAt,
      totalVideos: videos.length,
      uniqueYtIds: allYtIds.length,
      facultiesSynced,
      videosUpdated,
    });
  } catch (err) {
    console.error("[YT Sync] Fatal error:", err);
    return NextResponse.json({ error: "Sync failed", details: String(err) }, { status: 500 });
  }
}
