import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ddb = DynamoDBDocumentClient.from(client);
const GRADI_URL = "https://gradi.ai/api/analyze-video";

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function analyzeWithGradi(youtubeUrl: string, videoId: string): Promise<any> {
  console.log(`Calling Gradi API for video: ${videoId} (${youtubeUrl})...`);
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

  const json = await res.json();
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

async function run() {
  try {
    // 1. Fetch all videos
    console.log("Fetching all videos from DynamoDB...");
    const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
    const videos = videosRes.Items || [];
    console.log(`Found ${videos.length} videos in total.`);

    // 2. Identify duplicates
    const groups: Record<string, any[]> = {};
    for (const v of videos) {
      const ytId = extractYouTubeId(v.youtubeUrl);
      if (!ytId) {
        console.log(`Skipped invalid url video: ${v.videoId} - ${v.youtubeUrl}`);
        continue;
      }
      if (!groups[ytId]) groups[ytId] = [];
      groups[ytId].push(v);
    }

    // 3. Remove duplicates
    let deletedCount = 0;
    for (const ytId in groups) {
      const list = groups[ytId];
      if (list.length > 1) {
        // Sort by uploadedAt ascending, keep the first one
        list.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
        const keep = list[0];
        const toDelete = list.slice(1);
        console.log(`Duplicate found for YouTube ID: ${ytId} ("${keep.title}"). Keeping ${keep.videoId}. Deleting ${toDelete.length} duplicates...`);

        for (const v of toDelete) {
          console.log(`Deleting duplicate video ${v.videoId} (Faculty: ${v.facultyId})`);
          
          // Delete video record
          await ddb.send(new DeleteCommand({
            TableName: "fep-videos",
            Key: { facultyId: v.facultyId, videoId: v.videoId }
          }));

          // Delete analysis record
          await ddb.send(new DeleteCommand({
            TableName: "fep-gradi-analyses",
            Key: { videoId: v.videoId }
          }));

          // Query & delete ratings
          const ratingsRes = await ddb.send(new QueryCommand({
            TableName: "fep-manager-ratings",
            KeyConditionExpression: "videoId = :v",
            ExpressionAttributeValues: { ":v": v.videoId }
          }));
          const ratings = ratingsRes.Items || [];
          for (const rating of ratings) {
            await ddb.send(new DeleteCommand({
              TableName: "fep-manager-ratings",
              Key: { videoId: v.videoId, managerId: rating.managerId }
            }));
          }
          deletedCount++;
        }
      }
    }
    console.log(`Finished duplicate cleanup. Removed ${deletedCount} duplicate entries.`);

    // Refresh video list after cleanup
    const refreshedRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
    const activeVideos = refreshedRes.Items || [];

    // 4. Find analyzed videos
    const analysesRes = await ddb.send(new ScanCommand({ TableName: "fep-gradi-analyses", ProjectionExpression: "videoId" }));
    const analyzedIds = new Set((analysesRes.Items || []).map(item => item.videoId));

    const pendingVideos = activeVideos.filter(v => !analyzedIds.has(v.videoId) && v.status !== "manager_rated");
    console.log(`Found ${pendingVideos.length} videos that need Gradi analysis.`);

    // 5. Analyze pending videos
    for (const v of pendingVideos) {
      try {
        const analysis = await analyzeWithGradi(v.youtubeUrl, v.videoId);
        await ddb.send(new PutCommand({
          TableName: "fep-gradi-analyses",
          Item: analysis
        }));
        await ddb.send(new UpdateCommand({
          TableName: "fep-videos",
          Key: { facultyId: v.facultyId, videoId: v.videoId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "gradi_done" }
        }));
        console.log(`Successfully completed analysis for ${v.videoId}`);
      } catch (err: any) {
        console.error(`Failed to analyze video ${v.videoId}:`, err.message);
      }
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("Deduplication and analysis script completed successfully!");
  } catch (err) {
    console.error("Error in script:", err);
  }
}

run();
