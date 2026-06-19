import { NextResponse, after } from "next/server";
import {
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  GetCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import type { GradiAnalysis, ManagerRating, User, Video, JWTPayload } from "@/types";
import { processPendingQueue } from "@/lib/gradi";
import { extractYouTubeId } from "@/lib/utils";

const YT_API_KEY = process.env.YOUTUBE_API_KEY ?? "";

function parseYTDuration(dur: string): string {
  if (!dur) return "";
  const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const h = match?.[1] ? `${match[1]}:` : "";
  const m = match?.[2] || "0";
  const s = match?.[3]?.padStart(2, "0") || "00";
  return h ? `${h}${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
}

interface VideoStat {
  id: string;
  views: number;
  likes: number;
  channelId: string;
  duration: string;
}

async function fetchYouTubeVideoStatsBatch(ytIds: string[]): Promise<VideoStat[]> {
  if (ytIds.length === 0) return [];
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${ytIds.join(",")}&key=${YT_API_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item: any) => ({
      id: item.id,
      views: Number(item.statistics?.viewCount ?? 0),
      likes: Number(item.statistics?.likeCount ?? 0),
      channelId: item.snippet?.channelId ?? "",
      duration: parseYTDuration(item.contentDetails?.duration ?? ""),
    }));
  } catch (err) {
    console.error("fetchYouTubeVideoStatsBatch error:", err);
    return [];
  }
}

async function fetchYouTubeChannelSubsBatch(channelIds: string[]) {
  if (channelIds.length === 0) return {};
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelIds.join(",")}&key=${YT_API_KEY}`
    );
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<string, number> = {};
    (data.items ?? []).forEach((item: any) => {
      map[item.id] = Number(item.statistics?.subscriberCount ?? 0);
    });
    return map;
  } catch (err) {
    console.error("fetchYouTubeChannelSubsBatch error:", err);
    return {};
  }
}

async function triggerBackgroundFacultyYTSync(facultyId: string, videos: Video[]) {
  after(async () => {
    try {
      console.log(`[Background YT Sync] Starting for faculty ${facultyId}`);
      const ytIdSet = new Set<string>();
      for (const v of videos) {
        const id = extractYouTubeId(v.youtubeUrl);
        if (id) ytIdSet.add(id);
      }
      const ytIds = Array.from(ytIdSet);
      if (ytIds.length === 0) return;

      const statsMap = new Map<string, { views: number; likes: number; channelId: string; duration: string }>();
      const BATCH_SIZE = 50;
      for (let i = 0; i < ytIds.length; i += BATCH_SIZE) {
        const batch = ytIds.slice(i, i + BATCH_SIZE);
        const results = await fetchYouTubeVideoStatsBatch(batch);
        results.forEach((r) => {
          statsMap.set(r.id, {
            views: r.views,
            likes: r.likes,
            channelId: r.channelId,
            duration: r.duration,
          });
        });
      }

      const channelIds = [...new Set([...statsMap.values()].map(s => s.channelId).filter(Boolean))];
      const channelSubsMap = new Map<string, number>();
      for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
        const batch = channelIds.slice(i, i + BATCH_SIZE);
        const results = await fetchYouTubeChannelSubsBatch(batch);
        Object.entries(results).forEach(([cid, subs]) => {
          channelSubsMap.set(cid, subs);
        });
      }

      let totalViews = 0;
      let totalLikes = 0;
      let channelId = "";

      for (const v of videos) {
        const ytId = extractYouTubeId(v.youtubeUrl);
        if (!ytId) continue;
        const s = ytId ? statsMap.get(ytId) : null;
        
        if (s) {
          totalViews += s.views;
          totalLikes += s.likes;
          if (!channelId && s.channelId) channelId = s.channelId;

          if (v.views !== s.views || v.likes !== s.likes || (!v.duration && s.duration)) {
            await ddb.send(new UpdateCommand({
              TableName: TABLES.VIDEOS,
              Key: { facultyId: v.facultyId, videoId: v.videoId },
              UpdateExpression: "SET #views = :v, likes = :l, #dur = :d",
              ExpressionAttributeNames: { "#views": "views", "#dur": "duration" },
              ExpressionAttributeValues: { ":v": s.views, ":l": s.likes, ":d": s.duration || v.duration || "" },
            })).catch(e => console.error(`[Background YT Sync] Video update failed ${v.videoId}:`, e));
          }
        } else {
          // Fall back to stats already stored on the video item in the DB
          totalViews += v.views ?? 0;
          totalLikes += v.likes ?? 0;
        }
      }

      const currentCache = await getCachedYTStats(facultyId);
      
      let subscribers = channelId ? (channelSubsMap.get(channelId) ?? 0) : 0;
      if (subscribers === 0 && currentCache?.subscribers) {
        subscribers = currentCache.subscribers;
      }
      
      if (totalViews === 0 && currentCache?.totalViews) {
        totalViews = currentCache.totalViews;
      }
      if (totalLikes === 0 && currentCache?.totalLikes) {
        totalLikes = currentCache.totalLikes;
      }

      const syncedAt = new Date().toISOString();

      await ddb.send(new PutCommand({
        TableName: TABLES.YT_STATS,
        Item: { facultyId, totalViews, totalLikes, subscribers, channelId, syncedAt },
      }));
      console.log(`[Background YT Sync] Completed for faculty ${facultyId}. Views: ${totalViews}, Subs: ${subscribers}`);
    } catch (err) {
      console.error(`[Background YT Sync] Error for faculty ${facultyId}:`, err);
    }
  });
}


// ── Cached YT stats row shape ──────────────────────────────────────
interface YTStatsRow {
  facultyId: string;
  totalViews: number;
  totalLikes: number;
  subscribers: number;
  channelId?: string;
  syncedAt?: string;
}

// ── Self-healing: fill missing duration/thumbnail/title for videos ──
async function fetchYouTubeMetadata(youtubeUrl: string) {
  const ytId = extractYouTubeId(youtubeUrl);
  if (!ytId) return null;
  try {
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${ytId}&key=${YT_API_KEY}`
    );
    if (!ytRes.ok) {
      throw new Error(`YouTube API returned status ${ytRes.status}`);
    }
    const ytData = await ytRes.json();
    if (!ytData.items?.length) {
      throw new Error("No items found in YouTube API response");
    }
    const item = ytData.items[0];
    const stats = item.statistics || {};
    const details = item.contentDetails || {};
    const snippet = item.snippet || {};

    const dur = details.duration || "";
    const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const h = match?.[1] ? `${match[1]}:` : "";
    const m = match?.[2] || "0";
    const s = match?.[3]?.padStart(2, "0") || "00";
    const duration = h ? `${h}${m.padStart(2, "0")}:${s}` : `${m}:${s}`;

    return {
      title: snippet.title || "",
      duration,
      thumbnailUrl:
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.default?.url ||
        "",
      views: Number(stats.viewCount || 0),
      likes: Number(stats.likeCount || 0),
    };
  } catch (err) {
    console.error("fetchYouTubeMetadata error:", err);
    // Fallback to oEmbed if YouTube API fails
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${ytId}`
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        return {
          title: oembedData.title || "",
          duration: "",
          thumbnailUrl: oembedData.thumbnail_url || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          views: 0,
          likes: 0,
        };
      }
    } catch (oembedErr) {
      console.error("fetchYouTubeMetadata oEmbed fallback error:", oembedErr);
    }
    return null;
  }
}

function triggerSelfHealing(videos: Video[]) {
  const missing = videos.filter((v) => (!v.duration || !v.title || v.title === "Untitled Video") && v.youtubeUrl);
  if (missing.length === 0) return;
  after(async () => {
    try {
      console.log(
        `[Self-healing] ${missing.length} videos lacking details. Healing...`
      );
      for (const v of missing) {
        const metadata = await fetchYouTubeMetadata(v.youtubeUrl);
        if (metadata) {
          await ddb.send(
            new UpdateCommand({
              TableName: TABLES.VIDEOS,
              Key: { facultyId: v.facultyId, videoId: v.videoId },
              UpdateExpression:
                "SET duration = :dur, thumbnailUrl = :thumb, #views = :views, likes = :likes, #title = :title",
              ExpressionAttributeNames: { "#views": "views", "#title": "title" },
              ExpressionAttributeValues: {
                ":dur": metadata.duration || v.duration || "",
                ":thumb": metadata.thumbnailUrl || v.thumbnailUrl || "",
                ":views": metadata.views || v.views || 0,
                ":likes": metadata.likes || v.likes || 0,
                ":title": metadata.title || v.title || "Untitled Video",
              },
            })
          );
        }
      }
    } catch (err) {
      console.error("[Self-healing] Error:", err);
    }
  });
}

// ── Read cached per-faculty YT stats from fep-yt-stats ────────────
async function getCachedYTStats(facultyId: string): Promise<YTStatsRow | null> {
  try {
    const res = await ddb.send(
      new GetCommand({ TableName: TABLES.YT_STATS, Key: { facultyId } })
    );
    return (res.Item as YTStatsRow) ?? null;
  } catch {
    return null;
  }
}

// ── Main GET — aggregate stats ─────────────────────────────────────
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const facultyId = searchParams.get("facultyId") ?? user.userId;

  // Faculty: own stats only. Manager/Admin: any.
  if (user.role === "eduskill_faculty" && facultyId !== user.userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Fetch target faculty user details
  const facultyUserRes = await ddb.send(
    new GetCommand({ TableName: TABLES.USERS, Key: { userId: facultyId } })
  );
  const facultyUser = facultyUserRes.Item as User | undefined;

  if (searchParams.get("scope") === "all") {
    return aggregateAll(
      searchParams.get("cohort") ?? "June EduSkill",
      user
    );
  }

  const videosRes = await ddb.send(
    new QueryCommand({
      TableName: TABLES.VIDEOS,
      KeyConditionExpression: "facultyId = :f",
      ExpressionAttributeValues: { ":f": facultyId },
    })
  );
  const videos = (videosRes.Items ?? []) as Video[];
  processPendingQueue();
  triggerSelfHealing(videos);

  if (videos.length === 0) {
    return NextResponse.json({
      facultyId,
      facultyName: facultyUser?.name || "Unknown Faculty",
      facultyEmail: facultyUser?.email || "",
      cohort: facultyUser?.cohort || "June EduSkill",
      age: facultyUser?.age,
      dob: facultyUser?.dob,
      gender: (facultyUser as any)?.gender,
      teachingSubject: facultyUser?.teachingSubject,
      examTarget: facultyUser?.examTarget,
      subjects: facultyUser?.subjects || [],
      avatarUrl: facultyUser?.avatarUrl,
      totalVideos: 0,
      avgGradiScore: 0,
      pctRatedByManager: 0,
      totalViews: 0,
      totalLikes: 0,
      subscribers: 0,
      ytStatsSyncedAt: null,
      bySubject: {},
      videos: [],
    });
  }

  // ── Read cached YouTube stats (synced hourly by /api/youtube-sync) ──
  const ytCache = await getCachedYTStats(facultyId);

  const isStale = !ytCache || !ytCache.syncedAt || 
    (new Date().getTime() - new Date(ytCache.syncedAt).getTime() > 1000 * 60 * 60);

  if (isStale && videos.length > 0) {
    triggerBackgroundFacultyYTSync(facultyId, videos);
  }

  // ── Gradi analyses ──────────────────────────────────────────────
  const keys = videos.map((v) => ({ videoId: v.videoId }));
  const analysisChunks: GradiAnalysis[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const r = await ddb.send(
      new BatchGetCommand({
        RequestItems: { [TABLES.ANALYSES]: { Keys: chunk } },
      })
    );
    analysisChunks.push(
      ...((r.Responses?.[TABLES.ANALYSES] as GradiAnalysis[]) ?? [])
    );
  }

  const analysisMap = new Map(analysisChunks.map((a) => [a.videoId, a]));

  // ── Fetch manager ratings for these videos ──────────────────────
  const ratings: ManagerRating[] = [];
  const videoIds = videos.map((v) => v.videoId);
  if (videoIds.length > 0) {
    const ratingPromises = videoIds.map((vId) =>
      ddb.send(
        new QueryCommand({
          TableName: TABLES.RATINGS,
          KeyConditionExpression: "videoId = :v",
          ExpressionAttributeValues: { ":v": vId },
        })
      ).catch((e) => {
        console.error(`Error querying ratings for ${vId}:`, e);
        return { Items: [] };
      })
    );
    const ratingResults = await Promise.all(ratingPromises);
    ratingResults.forEach((r) => {
      if (r.Items) {
        ratings.push(...(r.Items as ManagerRating[]));
      }
    });
  }
  const ratingMap = new Map<string, ManagerRating[]>();
  for (const r of ratings) {
    if (!ratingMap.has(r.videoId)) ratingMap.set(r.videoId, []);
    ratingMap.get(r.videoId)!.push(r);
  }
  const ratedCount = videos.filter((v) => v.status === "manager_rated").length;
  const scores = analysisChunks
    .map((a) => a.gradiScore)
    .filter((n) => n > 0);
  const avg =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const bySubject: Record<
    string,
    { count: number; avgScore: number; videos: Video[] }
  > = {};
  for (const v of videos) {
    const sid = v.subjectId || "unknown";
    if (!bySubject[sid]) bySubject[sid] = { count: 0, avgScore: 0, videos: [] };
    bySubject[sid].count++;
    bySubject[sid].videos.push(v);
    const a = analysisMap.get(v.videoId);
    if (a?.gradiScore) {
      const cur = bySubject[sid].avgScore;
      const n = bySubject[sid].count;
      bySubject[sid].avgScore = (cur * (n - 1) + a.gradiScore) / n;
    }
  }

  return NextResponse.json({
    facultyId,
    facultyName: facultyUser?.name || "Unknown Faculty",
    facultyEmail: facultyUser?.email || "",
    cohort: facultyUser?.cohort || "June EduSkill",
    age: facultyUser?.age,
    dob: facultyUser?.dob,
    gender: (facultyUser as any)?.gender,
    teachingSubject: facultyUser?.teachingSubject,
    examTarget: facultyUser?.examTarget,
    subjects: facultyUser?.subjects || [],
    avatarUrl: facultyUser?.avatarUrl,
    totalVideos: videos.length,
    avgGradiScore: Number(avg.toFixed(2)),
    pctRatedByManager:
      videos.length > 0
        ? Math.round((ratedCount / videos.length) * 100)
        : 0,
    // ── YouTube aggregate stats (from hourly cache) ──
    totalViews: ytCache?.totalViews ?? 0,
    totalLikes: ytCache?.totalLikes ?? 0,
    subscribers: ytCache?.subscribers ?? 0,
    ytStatsSyncedAt: ytCache?.syncedAt ?? null,
    bySubject,
    videos: videos.map((v) => {
      const vRatings = ratingMap.get(v.videoId) || [];
      const own = vRatings.find((r) => r.managerId === "shared") || vRatings[0];
      return {
        ...v,
        analysis: analysisMap.get(v.videoId) ?? null,
        managerRating: own ?? null,
      };
    }),
  });
}

// ── aggregateAll — leaderboard / manager view ─────────────────────
async function aggregateAll(
  cohort: string = "June EduSkill",
  loggedInUser?: JWTPayload
) {
  // 1. Scan USERS to find faculty in the cohort (Scan is necessary as we have no index on cohort)
  const usersRes = await ddb.send(
    new ScanCommand({
      TableName: TABLES.USERS,
      FilterExpression: "#r = :r AND cohort = :c",
      ExpressionAttributeNames: { "#r": "role" },
      ExpressionAttributeValues: {
        ":r": "eduskill_faculty",
        ":c": cohort,
      },
    })
  );

  const users = (usersRes.Items ?? []) as User[];
  const facultyIds = users.map((u) => u.userId);

  // 2. Fetch videos only for these faculty using parallel QueryCommands (partition key query)
  const videoPromises = facultyIds.map((fId) =>
    ddb.send(
      new QueryCommand({
        TableName: TABLES.VIDEOS,
        KeyConditionExpression: "facultyId = :f",
        ExpressionAttributeValues: { ":f": fId },
      })
    )
  );
  const videoResults = await Promise.all(videoPromises);
  const videos = videoResults.flatMap((r) => r.Items ?? []) as Video[];
  const videoIds = videos.map((v) => v.videoId);

  // 3. BatchGet analyses for only the cohort's videos
  const analyses: GradiAnalysis[] = [];
  if (videoIds.length > 0) {
    const keys = videoIds.map((id) => ({ videoId: id }));
    for (let i = 0; i < keys.length; i += 100) {
      const chunk = keys.slice(i, i + 100);
      const res = await ddb.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLES.ANALYSES]: { Keys: chunk },
          },
        })
      );
      if (res.Responses?.[TABLES.ANALYSES]) {
        analyses.push(...(res.Responses[TABLES.ANALYSES] as GradiAnalysis[]));
      }
    }
  }

  // 4. Query ratings for each video individually
  const ratings: ManagerRating[] = [];
  if (videoIds.length > 0) {
    const ratingPromises = videoIds.map((vId) =>
      ddb.send(
        new QueryCommand({
          TableName: TABLES.RATINGS,
          KeyConditionExpression: "videoId = :v",
          ExpressionAttributeValues: { ":v": vId },
        })
      )
    );
    const ratingResults = await Promise.all(ratingPromises);
    ratingResults.forEach((r) => {
      if (r.Items) {
        ratings.push(...(r.Items as ManagerRating[]));
      }
    });
  }

  // 5. BatchGet YT stats for the cohort's faculty
  const ytStatsRows: YTStatsRow[] = [];
  if (facultyIds.length > 0) {
    const keys = facultyIds.map((id) => ({ facultyId: id }));
    for (let i = 0; i < keys.length; i += 100) {
      const chunk = keys.slice(i, i + 100);
      const res = await ddb.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLES.YT_STATS]: { Keys: chunk },
          },
        })
      );
      if (res.Responses?.[TABLES.YT_STATS]) {
        ytStatsRows.push(...(res.Responses[TABLES.YT_STATS] as YTStatsRow[]));
      }
    }
  }

  processPendingQueue();
  triggerSelfHealing(videos);

  const aMap = new Map(analyses.map((a) => [a.videoId, a]));

  // ── Build YT stats lookup by facultyId ─────────────────────────
  const ytMap = new Map<string, YTStatsRow>(
    ytStatsRows.map((row) => [row.facultyId, row])
  );

  let leaderboard: unknown[] = [];

  if (cohort === "March EduSkill") {
    // Fetch from Adjust
    const tokens = users
      .filter((u) => u.adjustToken)
      .map((u) => u.adjustToken!);
    const adjustMap = new Map<
      string,
      { installs: number; clicks: number; sessions: number }
    >();
    users.forEach((u) => {
      adjustMap.set(u.email.toLowerCase().trim(), {
        installs: 0,
        clicks: 0,
        sessions: 0,
      });
    });

    if (tokens.length > 0 && process.env.ADJUST_API_TOKEN) {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const datePeriod = `${start.toISOString().split("T")[0]}:${end.toISOString().split("T")[0]}`;
        const params = new URLSearchParams({
          dimensions: "network",
          metrics: "installs,clicks,sessions",
          date_period: datePeriod,
        });
        params.set("tracker_token__in", tokens.join(","));
        const res = await fetch(
          `https://dash.adjust.com/control-center/reports-service/report?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.ADJUST_API_TOKEN}`,
              Accept: "application/json",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const rows = data.rows ?? [];
          for (const row of rows) {
            const network = (
              (row.network as string) || ""
            ).toLowerCase();
            const matchingUser = users.find((u) =>
              network.includes(u.email.split("@")[0].toLowerCase())
            );
            if (matchingUser) {
              adjustMap.set(matchingUser.email.toLowerCase().trim(), {
                installs: Number(row.installs || 0),
                clicks: Number(row.clicks || 0),
                sessions: Number(row.sessions || 0),
              });
            }
          }
        }
      } catch (err) {
        console.error("Adjust API fetch error in stats aggregation:", err);
      }
    }

    leaderboard = users.map((u) => {
      const own = videos.filter((v) => v.facultyId === u.userId);
      const emailClean = u.email.toLowerCase().trim();
      const adjust = adjustMap.get(emailClean) ?? {
        installs: 0,
        clicks: 0,
        sessions: 0,
      };
      const yt = ytMap.get(u.userId);

      return {
        userId: u.userId,
        name: u.name,
        email: u.email,
        subjects: u.subjects,
        videoCount: own.length,
        installs: adjust.installs,
        views: yt?.totalViews ?? 0,
        likes: yt?.totalLikes ?? 0,
        subscribersGained: yt?.subscribers ?? 0,
        avatarUrl: u.avatarUrl,
        avgGradiScore: 0,
        ytStatsSyncedAt: yt?.syncedAt ?? null,
      };
    });
    (leaderboard as { installs: number }[]).sort(
      (a, b) => b.installs - a.installs
    );
  } else {
    leaderboard = users.map((u) => {
      const own = videos.filter((v) => v.facultyId === u.userId);
      const scores = own
        .map((v) => aMap.get(v.videoId)?.gradiScore || 0)
        .filter((n) => n > 0);
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      const combinedScores = own.map((v) => {
        const a = aMap.get(v.videoId);
        const vRatings = ratings.filter((rt) => rt.videoId === v.videoId);
        const r = vRatings.find((rt) => rt.managerId === "shared") || vRatings[0];
        const gradiContrib = a ? Math.round(a.gradiScore * 5 * 10) / 10 : 0;
        const managerScore = r ? r.total : 0;
        return gradiContrib + managerScore;
      });
      const avgCombined =
        combinedScores.length > 0
          ? combinedScores.reduce((a, b) => a + b, 0) / combinedScores.length
          : 0;

      const yt = ytMap.get(u.userId);

      return {
        userId: u.userId,
        name: u.name,
        email: u.email,
        subjects: u.subjects,
        videoCount: own.length,
        avgGradiScore: Number(avg.toFixed(2)),
        avgCombinedScore: Number(avgCombined.toFixed(2)),
        totalViews: yt?.totalViews ?? 0,
        totalLikes: yt?.totalLikes ?? 0,
        subscribers: yt?.subscribers ?? 0,
        ytStatsSyncedAt: yt?.syncedAt ?? null,
        avatarUrl: u.avatarUrl,
      };
    });
    (leaderboard as { avgCombinedScore: number }[]).sort(
      (a, b) => b.avgCombinedScore - a.avgCombinedScore
    );
  }

  // ── Per-subject radar aggregate ────────────────────────────────
  const subjectAgg: Record<
    string,
    { keys: string[]; sums: number[]; n: number }
  > = {};
  const ratingKeys = [
    "ratingClarity",
    "ratingDepth",
    "ratingStructure",
    "ratingCommunication",
    "ratingInteraction",
    "ratingCommercial",
  ] as const;
  for (const v of videos) {
    const a = aMap.get(v.videoId);
    if (!a) continue;
    const sid = v.subjectId || "unknown";
    if (!subjectAgg[sid]) {
      subjectAgg[sid] = { keys: [...ratingKeys], sums: [0, 0, 0, 0, 0, 0], n: 0 };
    }
    ratingKeys.forEach((k, i) => {
      subjectAgg[sid].sums[i] += a[k] ?? 0;
    });
    subjectAgg[sid].n++;
  }

  return NextResponse.json({
    leaderboard,
    totalFaculty: users.length,
    totalVideos: videos.length,
    totalAnalyses: analyses.length,
    totalRatings: ratings.length,
    subjectAgg,
  });
}
