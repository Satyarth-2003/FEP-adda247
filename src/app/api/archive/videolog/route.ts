import { NextResponse } from "next/server";
import { ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import type { Video, GradiAnalysis, ManagerRating } from "@/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // Get all videos
  const videosRes = await ddb.send(new ScanCommand({ TableName: TABLES.VIDEOS }));
  const videos = (videosRes.Items ?? []) as Video[];

  if (videos.length === 0) return NextResponse.json({ rows: [] });

  // Batch get analyses
  const analysisKeys = videos.map(v => ({ videoId: v.videoId }));
  const analyses: GradiAnalysis[] = [];
  for (let i = 0; i < analysisKeys.length; i += 100) {
    const chunk = analysisKeys.slice(i, i + 100);
    const r = await ddb.send(new BatchGetCommand({
      RequestItems: { [TABLES.ANALYSES]: { Keys: chunk } },
    }));
    analyses.push(...((r.Responses?.[TABLES.ANALYSES] as GradiAnalysis[]) ?? []));
  }
  const aMap = new Map(analyses.map(a => [a.videoId, a]));

  // Get all manager ratings
  const ratingsRes = await ddb.send(new ScanCommand({ TableName: TABLES.RATINGS }));
  const ratings = (ratingsRes.Items ?? []) as ManagerRating[];
  const rMap = new Map<string, ManagerRating>();
  for (const r of ratings) rMap.set(r.videoId, r);

  // Build rows
  const rows = videos.map(v => {
    const a = aMap.get(v.videoId);
    const r = rMap.get(v.videoId);
    const boardWork = r?.boardWork ?? null;
    const visualTLM = r?.visualTLM ?? null;
    const energy = r?.energy ?? null;
    const delivery = r?.delivery ?? null;
    const hook = r?.hook ?? null;
    const managerTotal = r ? (boardWork ?? 0) + (visualTLM ?? 0) + (energy ?? 0) + (delivery ?? 0) + (hook ?? 0) : null;
    const gradiContrib = a ? Math.round(a.gradiScore * 5 * 10) / 10 : null;
    const combinedTotal = managerTotal != null && gradiContrib != null ? Number((managerTotal + gradiContrib).toFixed(1)) : null;

    return {
      trainee: v.facultyName ?? v.facultyId,
      facultyId: v.facultyId,
      date: v.uploadedAt?.split("T")[0] ?? null,
      uploadedAt: v.uploadedAt,
      link: v.youtubeUrl,
      title: v.title,
      subject: v.subject,
      subjectId: v.subjectId,
      boardWork,
      visualTLM,
      energy,
      delivery,
      hook,
      managerTotal,
      gradiScore: a?.gradiScore ?? null,
      gradiContrib,
      combinedTotal,
      status: v.status,
      videoId: v.videoId,
    };
  });

  rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return NextResponse.json({ rows });
}
