import { NextResponse } from "next/server";
import { QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import type { GradiAnalysis, ManagerRating, User, Video } from "@/types";

// Aggregate stats — for hero card and leaderboard
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const facultyId = searchParams.get("facultyId") ?? user.userId;

  // Faculty: own stats only. Manager: any.
  if (user.role === "fep_faculty" && facultyId !== user.userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (searchParams.get("scope") === "all" && user.role === "fep_manager" || user.role === "fep_admin") {
    return aggregateAll();
  }

  const videosRes = await ddb.send(
    new QueryCommand({
      TableName: TABLES.VIDEOS,
      KeyConditionExpression: "facultyId = :f",
      ExpressionAttributeValues: { ":f": facultyId },
    })
  );
  const videos = (videosRes.Items ?? []) as Video[];

  if (videos.length === 0) {
    return NextResponse.json({
      facultyId,
      totalVideos: 0,
      avgGradiScore: 0,
      pctRatedByManager: 0,
      bySubject: {},
      videos: [],
    });
  }

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

  const ratedCount = videos.filter((v) => v.status === "manager_rated").length;
  const scores = analysisChunks.map((a) => a.gradiScore).filter((n) => n > 0);
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
    totalVideos: videos.length,
    avgGradiScore: Number(avg.toFixed(2)),
    pctRatedByManager:
      videos.length > 0 ? Math.round((ratedCount / videos.length) * 100) : 0,
    bySubject,
    videos: videos.map((v) => ({
      ...v,
      analysis: analysisMap.get(v.videoId) ?? null,
    })),
  });
}

async function aggregateAll() {
  const [usersRes, videosRes, analysesRes, ratingsRes] = await Promise.all([
    ddb.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "#r = :r",
        ExpressionAttributeNames: { "#r": "role" },
        ExpressionAttributeValues: { ":r": "fep_faculty" },
      })
    ),
    ddb.send(new ScanCommand({ TableName: TABLES.VIDEOS })),
    ddb.send(new ScanCommand({ TableName: TABLES.ANALYSES })),
    ddb.send(new ScanCommand({ TableName: TABLES.RATINGS })),
  ]);

  const users = (usersRes.Items ?? []) as User[];
  const videos = (videosRes.Items ?? []) as Video[];
  const analyses = (analysesRes.Items ?? []) as GradiAnalysis[];
  const ratings = (ratingsRes.Items ?? []) as ManagerRating[];
  const aMap = new Map(analyses.map((a) => [a.videoId, a]));

  const leaderboard = users.map((u) => {
    const own = videos.filter((v) => v.facultyId === u.userId);
    const scores = own
      .map((v) => aMap.get(v.videoId)?.gradiScore || 0)
      .filter((n) => n > 0);
    const avg =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      userId: u.userId,
      name: u.name,
      email: u.email,
      subjects: u.subjects,
      videoCount: own.length,
      avgGradiScore: Number(avg.toFixed(2)),
    };
  });
  leaderboard.sort((a, b) => b.avgGradiScore - a.avgGradiScore);

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
