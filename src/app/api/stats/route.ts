import { NextResponse, after } from "next/server";
import { QueryCommand, ScanCommand, BatchGetCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import type { GradiAnalysis, ManagerRating, User, Video, JWTPayload } from "@/types";
import { processPendingQueue } from "@/lib/gradi";
import { extractYouTubeId } from "@/lib/utils";

const YT_API_KEY = "AIzaSyB7u1Gb5DbKiI_LgLBAsnfjG4JouBkTpAs";

async function fetchYouTubeMetadata(youtubeUrl: string) {
  const ytId = extractYouTubeId(youtubeUrl);
  if (!ytId) return null;
  try {
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${ytId}&key=${YT_API_KEY}`
    );
    const ytData = await ytRes.json();
    if (!ytData.items?.length) return null;
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
      thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
      views: Number(stats.viewCount || 0),
      likes: Number(stats.likeCount || 0),
    };
  } catch (err) {
    console.error("fetchYouTubeMetadata error:", err);
    return null;
  }
}

function triggerSelfHealing(videos: Video[]) {
  const missing = videos.filter(v => !v.duration && v.youtubeUrl);
  if (missing.length === 0) return;
  after(async () => {
    try {
      console.log(`[Self-healing] Found ${missing.length} videos lacking duration. Healing...`);
      for (const v of missing) {
        const metadata = await fetchYouTubeMetadata(v.youtubeUrl);
        if (metadata) {
          await ddb.send(new UpdateCommand({
            TableName: TABLES.VIDEOS,
            Key: { facultyId: v.facultyId, videoId: v.videoId },
            UpdateExpression: "SET duration = :dur, thumbnailUrl = :thumb, views = :views, likes = :likes",
            ExpressionAttributeValues: {
              ":dur": metadata.duration,
              ":thumb": metadata.thumbnailUrl || v.thumbnailUrl || "",
              ":views": metadata.views,
              ":likes": metadata.likes,
            }
          }));
          console.log(`[Self-healing] Healed video ${v.videoId} with duration ${metadata.duration}`);
        }
      }
    } catch (err) {
      console.error("[Self-healing] Error in background worker:", err);
    }
  });
}

interface LiveVideoStats {
  views: number;
  likes: number;
  comments: number;
  channelId: string;
}

async function fetchLiveStatsForVideos(videoUrls: string[]): Promise<{
  videoStats: Record<string, LiveVideoStats>;
  channelSubs: Record<string, number>;
}> {
  const videoStats: Record<string, LiveVideoStats> = {};
  const channelSubs: Record<string, number> = {};

  const ytIdsMap = new Map<string, string>();
  const ytIds: string[] = [];

  for (const url of videoUrls) {
    const id = extractYouTubeId(url);
    if (id) {
      ytIdsMap.set(url, id);
      ytIds.push(id);
    }
  }

  if (ytIds.length === 0) return { videoStats, channelSubs };

  try {
    const channelIdsSet = new Set<string>();

    for (let i = 0; i < ytIds.length; i += 50) {
      const batch = ytIds.slice(i, i + 50);
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${batch.join(",")}&key=${YT_API_KEY}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.items || []) {
        const id = item.id;
        const stats = item.statistics || {};
        const snippet = item.snippet || {};
        const channelId = snippet.channelId || "";
        
        videoStats[id] = {
          views: Number(stats.viewCount || 0),
          likes: Number(stats.likeCount || 0),
          comments: Number(stats.commentCount || 0),
          channelId,
        };

        if (channelId) {
          channelIdsSet.add(channelId);
        }
      }
    }

    const channelIds = Array.from(channelIdsSet);
    for (let i = 0; i < channelIds.length; i += 50) {
      const batch = channelIds.slice(i, i + 50);
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${batch.join(",")}&key=${YT_API_KEY}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.items || []) {
        const id = item.id;
        const stats = item.statistics || {};
        channelSubs[id] = Number(stats.subscriberCount || 0);
      }
    }
  } catch (err) {
    console.error("fetchLiveStatsForVideos error:", err);
  }

  return { videoStats, channelSubs };
}

// Aggregate stats — for hero card and leaderboard
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const facultyId = searchParams.get("facultyId") ?? user.userId;

  // Faculty: own stats only. Manager: any.
  if (user.role === "eduskill_faculty" && facultyId !== user.userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Fetch target faculty user details
  const facultyUserRes = await ddb.send(
    new GetCommand({
      TableName: TABLES.USERS,
      Key: { userId: facultyId },
    })
  );
  const facultyUser = facultyUserRes.Item as User | undefined;

  if (searchParams.get("scope") === "all") {
    return aggregateAll(searchParams.get("cohort") ?? "June EduSkill", user);
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
      totalVideos: 0,
      avgGradiScore: 0,
      pctRatedByManager: 0,
      bySubject: {},
      videos: [],
      subscribers: 0,
    });
  }

  // Fetch live stats for faculty videos
  const validUrls = videos.map(v => v.youtubeUrl).filter((url): url is string => typeof url === "string");
  const { videoStats, channelSubs } = await fetchLiveStatsForVideos(validUrls);

  // Update DB if out of sync, and use live values
  const updatedVideos = videos.map(v => {
    const ytId = v.youtubeUrl ? extractYouTubeId(v.youtubeUrl) : null;
    const live = ytId ? videoStats[ytId] : null;
    if (live) {
      if (v.views !== live.views || v.likes !== live.likes) {
        ddb.send(new UpdateCommand({
          TableName: TABLES.VIDEOS,
          Key: { facultyId: v.facultyId, videoId: v.videoId },
          UpdateExpression: "SET #views = :v, likes = :l",
          ExpressionAttributeNames: { "#views": "views" },
          ExpressionAttributeValues: { ":v": live.views, ":l": live.likes }
        })).catch(e => console.error("Out-of-sync stat update failed:", e));
      }
      return { ...v, views: live.views, likes: live.likes };
    }
    return v;
  });

  // Get first channel ID to check subscriber count
  let channelId = "";
  for (const v of updatedVideos) {
    const ytId = v.youtubeUrl ? extractYouTubeId(v.youtubeUrl) : null;
    const live = ytId ? videoStats[ytId] : null;
    if (live && live.channelId) {
      channelId = live.channelId;
      break;
    }
  }
  const liveSubs = channelId ? (channelSubs[channelId] || 0) : 0;

  const keys = updatedVideos.map((v) => ({ videoId: v.videoId }));
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

  const ratedCount = updatedVideos.filter((v) => v.status === "manager_rated").length;
  const scores = analysisChunks.map((a) => a.gradiScore).filter((n) => n > 0);
  const avg =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const bySubject: Record<
    string,
    { count: number; avgScore: number; videos: Video[] }
  > = {};
  for (const v of updatedVideos) {
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
    subjects: facultyUser?.subjects || [],
    avatarUrl: facultyUser?.avatarUrl,
    totalVideos: updatedVideos.length,
    avgGradiScore: Number(avg.toFixed(2)),
    pctRatedByManager:
      updatedVideos.length > 0 ? Math.round((ratedCount / updatedVideos.length) * 100) : 0,
    bySubject,
    videos: updatedVideos.map((v) => ({
      ...v,
      analysis: analysisMap.get(v.videoId) ?? null,
    })),
    subscribers: liveSubs,
  });
}

async function aggregateAll(cohort: string = "June EduSkill", loggedInUser?: JWTPayload) {
  const [usersRes, videosRes, analysesRes, ratingsRes] = await Promise.all([
    ddb.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "#r = :r AND cohort = :c",
        ExpressionAttributeNames: { "#r": "role" },
        ExpressionAttributeValues: { ":r": "eduskill_faculty", ":c": cohort },
      })
    ),
    ddb.send(new ScanCommand({ TableName: TABLES.VIDEOS })),
    ddb.send(new ScanCommand({ TableName: TABLES.ANALYSES })),
    ddb.send(new ScanCommand({ TableName: TABLES.RATINGS })),
  ]);

  const users = (usersRes.Items ?? []) as User[];
  const videos = (videosRes.Items ?? []) as Video[];
  const analyses = (analysesRes.Items ?? []) as GradiAnalysis[];
  processPendingQueue();
  triggerSelfHealing(videos);
  const ratings = (ratingsRes.Items ?? []) as ManagerRating[];
  const aMap = new Map(analyses.map((a) => [a.videoId, a]));

  // ── FETCH LIVE YOUTUBE STATS FOR LEADERBOARD VIDEOS ──
  const cohortVideos = videos.filter(v => users.some(u => u.userId === v.facultyId));
  const videoUrls = cohortVideos.map(v => v.youtubeUrl).filter((url): url is string => typeof url === "string");
  const { videoStats, channelSubs } = await fetchLiveStatsForVideos(videoUrls);

  // Helper to get live sum of views, likes, and channel subscriber count
  function getUserLiveStats(userVideos: Video[]) {
    let views = 0;
    let likes = 0;
    let channelId = "";

    for (const v of userVideos) {
      const ytId = v.youtubeUrl ? extractYouTubeId(v.youtubeUrl) : null;
      const live = ytId ? videoStats[ytId] : null;
      if (live) {
        views += live.views;
        likes += live.likes;
        if (!channelId && live.channelId) {
          channelId = live.channelId;
        }

        // Background update if DynamoDB is out of sync
        if (v.views !== live.views || v.likes !== live.likes) {
          ddb.send(new UpdateCommand({
            TableName: TABLES.VIDEOS,
            Key: { facultyId: v.facultyId, videoId: v.videoId },
            UpdateExpression: "SET #views = :v, likes = :l",
            ExpressionAttributeNames: { "#views": "views" },
            ExpressionAttributeValues: { ":v": live.views, ":l": live.likes }
          })).catch(e => console.error("Out-of-sync stat update failed:", e));
        }
      } else {
        views += (v.views || 0);
        likes += (v.likes || 0);
      }
    }

    const subs = channelId ? (channelSubs[channelId] || 0) : 0;
    return { views, likes, subs };
  }

  let leaderboard: any[] = [];

  if (cohort === "March EduSkill") {
    // Fetch from Adjust
    const tokens = users.filter(u => u.adjustToken).map(u => u.adjustToken!);
    const adjustMap = new Map<string, { installs: number; clicks: number; sessions: number }>();
    
    users.forEach((u) => {
      adjustMap.set(u.email.toLowerCase().trim(), { installs: 0, clicks: 0, sessions: 0 });
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
        const res = await fetch(`https://dash.adjust.com/control-center/reports-service/report?${params.toString()}`, {
          headers: { "Authorization": `Bearer ${process.env.ADJUST_API_TOKEN}`, "Accept": "application/json" }
        });
        if (res.ok) {
          const data = await res.json();
          const rows = data.rows ?? [];
          for (const row of rows) {
            const network = (row.network as string || "").toLowerCase();
            const matchingUser = users.find(u => network.includes(u.email.split("@")[0].toLowerCase()));
            if (matchingUser) {
              adjustMap.set(matchingUser.email.toLowerCase().trim(), {
                installs: Number(row.installs || 0),
                clicks: Number(row.clicks || 0),
                sessions: Number(row.sessions || 0)
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
      const adjust = adjustMap.get(emailClean) ?? { installs: 0, clicks: 0, sessions: 0 };
      const live = getUserLiveStats(own);

      return {
        userId: u.userId,
        name: u.name,
        email: u.email,
        subjects: u.subjects,
        videoCount: own.length,
        installs: adjust.installs,
        views: live.views,
        subscribersGained: live.subs,
        avatarUrl: u.avatarUrl,
        avgGradiScore: 0,
      };
    });
    leaderboard.sort((a, b) => b.installs - a.installs);
  } else {
    leaderboard = users.map((u) => {
      const own = videos.filter((v) => v.facultyId === u.userId);
      const scores = own
        .map((v) => aMap.get(v.videoId)?.gradiScore || 0)
        .filter((n) => n > 0);
      const avg =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      const combinedScores = own.map((v) => {
        const a = aMap.get(v.videoId);
        const vRatings = ratings.filter((rt) => rt.videoId === v.videoId);
        let r: ManagerRating | undefined;
        if (loggedInUser && (loggedInUser.role === "eduskill_manager" || loggedInUser.role === "eduskill_admin")) {
          r = vRatings.find((rt) => rt.managerId === loggedInUser.userId);
        }
        if (!r && vRatings.length > 0) {
          const sorted = [...vRatings].sort((x, y) => y.total - x.total);
          r = sorted[0];
        }
        const gradiContrib = a ? Math.round(a.gradiScore * 5 * 10) / 10 : 0;
        const managerScore = r ? r.total : 0;
        return gradiContrib + managerScore;
      });
      const avgCombined = combinedScores.length > 0 ? combinedScores.reduce((a, b) => a + b, 0) / combinedScores.length : 0;

      return {
        userId: u.userId,
        name: u.name,
        email: u.email,
        subjects: u.subjects,
        videoCount: own.length,
        avgGradiScore: Number(avg.toFixed(2)),
        avgCombinedScore: Number(avgCombined.toFixed(2)),
      };
    });
    leaderboard.sort((a, b) => b.avgCombinedScore - a.avgCombinedScore);
  }

  // Per-subject aggregate (radar)
  const subjectAgg: Record<string, { keys: string[]; sums: number[]; n: number }> =
    {};
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
