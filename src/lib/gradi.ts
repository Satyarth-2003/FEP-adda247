import type { GradiAnalysis } from "@/types";

const GRADI_URL =
  process.env.GRADI_API_URL || "https://gradi.ai/api/analyze-video";

interface GradiRawResponse {
  data?: {
    analysis?: {
      gradi_score?: { score?: number; reason?: string };
      one_liner?: string;
      summary?: string;
      positives?: string[];
      areas_of_improvement?: string[];
      ratings?: Record<string, { score?: number }>;
    };
    video_metadata?: Record<string, unknown>;
    timestamp?: string;
  };
}

export async function analyzeWithGradi(
  youtubeUrl: string,
  videoId: string
): Promise<Omit<GradiAnalysis, "videoId"> & { videoId: string }> {
  const res = await fetch(GRADI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      youtube_url: youtubeUrl,
      analysis_language: "hinglish",
      category: null,
    }),
  });

  if (!res.ok) {
    throw new Error(`Gradi API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GradiRawResponse;
  const a = json?.data?.analysis;
  if (!a) throw new Error("Gradi: missing analysis in response");

  const r = a.ratings || {};
  const get = (k: string) => Number(r[k]?.score ?? 0);

  return {
    videoId,
    gradiScore: Number(a.gradi_score?.score ?? 0),
    scoreReason: a.gradi_score?.reason ?? "",
    oneLiner: a.one_liner ?? "",
    summary: a.summary ?? "",
    positives: a.positives ?? [],
    improvements: a.areas_of_improvement ?? [],
    ratingClarity: get("Clarity of Content"),
    ratingDepth: get("Content Depth"),
    ratingStructure: get("Content Structure"),
    ratingCommunication: get("Communication Effectiveness"),
    ratingInteraction: get("Student Interaction"),
    ratingCommercial: get("Commercial Balance"),
    videoMetadata: json.data?.video_metadata,
    analyzedAt: json.data?.timestamp ?? new Date().toISOString(),
  };
}

export async function healStuckVideos(videos: any[]) {
  const now = new Date();
  const stuckVideos = videos.filter(v => {
    if (v.status !== "analyzing") return false;
    if (!v.uploadedAt) return false;
    const uploadedTime = new Date(v.uploadedAt);
    const diffSeconds = (now.getTime() - uploadedTime.getTime()) / 1000;
    return diffSeconds > 40;
  });

  if (stuckVideos.length === 0) return;

  const { after } = await import("next/server");
  const { PutCommand, UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
  const { ddb, TABLES } = await import("./dynamodb");

  after(async () => {
    for (const v of stuckVideos) {
      console.log(`Auto-recovering skipped video analysis: ${v.videoId}`);
      try {
        const analysis = await analyzeWithGradi(v.youtubeUrl, v.videoId);
        await ddb.send(
          new PutCommand({ TableName: TABLES.ANALYSES, Item: analysis })
        );
        await ddb.send(
          new UpdateCommand({
            TableName: TABLES.VIDEOS,
            Key: { facultyId: v.facultyId, videoId: v.videoId },
            UpdateExpression: "SET #s = :s",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": "gradi_done" },
          })
        );
        console.log(`Successfully completed recovery analysis for ${v.videoId}`);
      } catch (err) {
        console.error(`Gradi auto-recovery failed for ${v.videoId}:`, err);
      }
    }
  });
}
