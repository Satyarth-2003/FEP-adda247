import type { GradiAnalysis } from "@/types";
import { extractYouTubeId } from "./utils";

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

export async function hasYouTubeTranscript(ytId: string): Promise<boolean> {
  const apiKey = process.env.YOUTUBE_API_KEY || "AIzaSyB7u1Gb5DbKiI_LgLBAsnfjG4JouBkTpAs";
  
  // 1. Try YouTube Data API captions list
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${ytId}&key=${apiKey}`
    );
    if (res.ok) {
      const json = await res.json();
      if (json.items && json.items.length > 0) {
        console.log(`[Transcript Check] YouTube API found captions for ${ytId}`);
        return true;
      }
    }
  } catch (e) {
    console.error("hasYouTubeTranscript API check error:", e);
  }

  // 2. Try scraping watch page for captionTracks (fallback)
  try {
    const url = `https://www.youtube.com/watch?v=${ytId}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });
    if (response.ok) {
      const html = await response.text();
      if (html.includes("captionTracks") || html.includes("playerCaptionsTracklistRenderer")) {
        console.log(`[Transcript Check] Watch page scraping found captions for ${ytId}`);
        return true;
      }
    }
  } catch (e) {
    console.error("hasYouTubeTranscript scraping fallback error:", e);
  }

  console.log(`[Transcript Check] No captions found for ${ytId}`);
  return false;
}

export async function analyzeWithGradi(
  youtubeUrl: string,
  videoId: string
): Promise<Omit<GradiAnalysis, "videoId"> & { videoId: string }> {
  const ytId = extractYouTubeId(youtubeUrl);
  const cleanUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : youtubeUrl;

  const res = await fetch(GRADI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      youtube_url: cleanUrl,
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

let isProcessingQueue = false;

export async function processPendingQueue() {
  if (isProcessingQueue) {
    console.log("[Queue] Queue processor is already active. Skipping duplicate trigger.");
    return;
  }
  isProcessingQueue = true;

  const { after } = await import("next/server");
  const { ScanCommand, PutCommand, UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
  const { ddb, TABLES } = await import("./dynamodb");

  after(async () => {
    try {
      console.log("[Queue] Scanning for videos with pending analysis (status 'analyzing' or 'uploaded')...");
      const videosRes = await ddb.send(new ScanCommand({
        TableName: TABLES.VIDEOS,
      }));
      const allVideos = videosRes.Items ?? [];
      const pendingVideos = allVideos.filter(v => v.status === "analyzing" || v.status === "uploaded");

      if (pendingVideos.length === 0) {
        console.log("[Queue] No pending videos found in database.");
        isProcessingQueue = false;
        return;
      }

      console.log(`[Queue] Found ${pendingVideos.length} pending videos. Starting sequential processing...`);

      for (const v of pendingVideos) {
        const ytId = extractYouTubeId(v.youtubeUrl);
        if (!ytId) {
          console.log(`[Queue] Skipped video with invalid URL: ${v.videoId} (${v.youtubeUrl})`);
          continue;
        }

        console.log(`[Queue] Checking transcript status for: ${v.videoId} (YouTube ID: ${ytId})`);
        const hasTranscript = await hasYouTubeTranscript(ytId);
        if (!hasTranscript) {
          console.log(`[Queue] No transcript available. Marking as no_transcript directly: ${v.videoId}`);
          await ddb.send(
            new UpdateCommand({
              TableName: TABLES.VIDEOS,
              Key: { facultyId: v.facultyId, videoId: v.videoId },
              UpdateExpression: "SET #s = :s",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: { ":s": "no_transcript" },
            })
          ).catch(() => {});
          continue;
        }

        console.log(`[Queue] Starting analysis for video: ${v.videoId} (${v.youtubeUrl})`);
        try {
          // Temporarily set to analyzing to mark it
          await ddb.send(
            new UpdateCommand({
              TableName: TABLES.VIDEOS,
              Key: { facultyId: v.facultyId, videoId: v.videoId },
              UpdateExpression: "SET #s = :s",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: { ":s": "analyzing" },
            })
          );

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
          console.log(`[Queue] Successfully completed analysis for video: ${v.videoId}`);
        } catch (err: any) {
          console.error(`[Queue] Gradi analysis failed for ${v.videoId}:`, err);
          const errorMsg = err?.message || "";
          const statusVal = errorMsg.toLowerCase().includes("transcript") || errorMsg.includes("analysis") ? "no_transcript" : "no_transcript";
          await ddb.send(
            new UpdateCommand({
              TableName: TABLES.VIDEOS,
              Key: { facultyId: v.facultyId, videoId: v.videoId },
              UpdateExpression: "SET #s = :s",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: { ":s": statusVal },
            })
          ).catch(() => {});
        }
        // Small cooldown to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.error("[Queue] Error in queue processor:", err);
    } finally {
      console.log("[Queue] Queue processor finished execution.");
      isProcessingQueue = false;
    }
  });
}
