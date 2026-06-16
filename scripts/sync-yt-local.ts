/**
 * Local YouTube stats sync using Supadata API (no quota limits).
 * Reads .env.local → fetches stats for all videos → writes per-faculty
 * totals to fep-yt-stats DynamoDB table.
 *
 * Run: npx tsx scripts/sync-yt-local.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const SUPADATA_KEY = process.env.SUPADATA_API_KEY!;
if (!SUPADATA_KEY) throw new Error("SUPADATA_API_KEY not set in .env.local");

const SUPADATA_VIDEO_URL = "https://api.supadata.ai/v1/youtube/video";
const SUPADATA_CHANNEL_URL = "https://api.supadata.ai/v1/youtube/channel";

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

// Supadata: fetch video stats (views, likes, channelId, duration)
async function fetchVideoStats(ytId: string): Promise<{
  views: number; likes: number; channelId: string; duration: number;
} | null> {
  try {
    const res = await fetch(`${SUPADATA_VIDEO_URL}?id=${ytId}`, {
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

// Supadata: fetch channel subscriber count
async function fetchChannelSubs(channelId: string): Promise<number> {
  try {
    const res = await fetch(`${SUPADATA_CHANNEL_URL}?id=${channelId}`, {
      headers: { "x-api-key": SUPADATA_KEY },
    });
    if (!res.ok) return 0;
    const d = await res.json();
    return Number(d.subscriberCount ?? 0);
  } catch {
    return 0;
  }
}

// Format seconds → "M:SS" or "H:MM:SS"
function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function run() {
  console.log("─────────────────────────────────────────────");
  console.log("  YouTube Stats Sync via Supadata API");
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log("─────────────────────────────────────────────\n");

  // 1. Load all videos
  const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const videos = (videosRes.Items ?? []) as any[];
  console.log(`✔ Loaded ${videos.length} videos from DynamoDB`);

  // 2. Collect unique YouTube IDs
  const ytIdSet = new Set<string>();
  for (const v of videos) {
    const id = extractYouTubeId(v.youtubeUrl);
    if (id) ytIdSet.add(id);
  }
  const ytIds = Array.from(ytIdSet);
  console.log(`✔ ${ytIds.length} unique YouTube IDs to fetch\n`);

  // 3. Fetch stats for each video (with concurrency limit of 5)
  const statsMap: Record<string, { views: number; likes: number; channelId: string; duration: number }> = {};
  const CONCURRENCY = 5;
  let done = 0;

  for (let i = 0; i < ytIds.length; i += CONCURRENCY) {
    const batch = ytIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(id => fetchVideoStats(id)));
    results.forEach((r, j) => {
      if (r) statsMap[batch[j]] = r;
    });
    done += batch.length;
    process.stdout.write(`\r  Fetching video stats: ${done}/${ytIds.length} (${Object.keys(statsMap).length} successful)`);
    // Small delay to avoid Supadata rate limiting
    if (i + CONCURRENCY < ytIds.length) await new Promise(r => setTimeout(r, 300));
  }
  console.log(`\n✔ Got stats for ${Object.keys(statsMap).length}/${ytIds.length} videos\n`);

  // 4. Fetch unique channel subscriber counts
  const channelIds = [...new Set(Object.values(statsMap).map(s => s.channelId).filter(Boolean))];
  const channelSubsMap: Record<string, number> = {};
  let chanDone = 0;
  for (let i = 0; i < channelIds.length; i += CONCURRENCY) {
    const batch = channelIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(id => fetchChannelSubs(id)));
    results.forEach((subs, j) => { channelSubsMap[batch[j]] = subs; });
    chanDone += batch.length;
    process.stdout.write(`\r  Fetching channel subs: ${chanDone}/${channelIds.length}`);
    if (i + CONCURRENCY < channelIds.length) await new Promise(r => setTimeout(r, 300));
  }
  console.log(`\n✔ Got subs for ${channelIds.length} channels\n`);

  // 5. Group videos by faculty
  const byFaculty: Record<string, any[]> = {};
  for (const v of videos) {
    if (!byFaculty[v.facultyId]) byFaculty[v.facultyId] = [];
    byFaculty[v.facultyId].push(v);
  }

  // 6. Write per-faculty totals + update individual video records
  const syncedAt = new Date().toISOString();
  let written = 0;
  let videosUpdated = 0;
  const facultyList = Object.entries(byFaculty);

  for (const [facultyId, fVideos] of facultyList) {
    let totalViews = 0;
    let totalLikes = 0;
    let channelId = "";

    for (const v of fVideos) {
      const ytId = extractYouTubeId(v.youtubeUrl);
      const s = ytId ? statsMap[ytId] : null;
      if (!s) continue;

      totalViews += s.views;
      totalLikes += s.likes;
      if (!channelId && s.channelId) channelId = s.channelId;

      // Sync individual video record (views, likes, duration)
      const newDuration = s.duration ? formatDuration(s.duration) : v.duration;
      const needsUpdate =
        v.views !== s.views ||
        v.likes !== s.likes ||
        (!v.duration && newDuration);

      if (needsUpdate) {
        await ddb.send(new UpdateCommand({
          TableName: "fep-videos",
          Key: { facultyId: v.facultyId, videoId: v.videoId },
          UpdateExpression: "SET #views = :v, likes = :l, #dur = :d",
          ExpressionAttributeNames: { "#views": "views", "#dur": "duration" },
          ExpressionAttributeValues: {
            ":v": s.views,
            ":l": s.likes,
            ":d": newDuration,
          },
        }));
        videosUpdated++;
      }
    }

    const subscribers = channelId ? (channelSubsMap[channelId] ?? 0) : 0;

    // Write faculty aggregate to fep-yt-stats
    await ddb.send(new PutCommand({
      TableName: "fep-yt-stats",
      Item: { facultyId, totalViews, totalLikes, subscribers, channelId, syncedAt },
    }));
    written++;
    process.stdout.write(`\r  Writing faculty stats: ${written}/${facultyList.length}`);
  }

  console.log(`\n\n✔ Wrote ${written} faculty rows to fep-yt-stats`);
  console.log(`✔ Updated ${videosUpdated} video records (views, likes, duration)`);
  console.log(`\n  Sync complete: ${syncedAt}`);
  console.log("─────────────────────────────────────────────\n");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
