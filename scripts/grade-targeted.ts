import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ddb = DynamoDBDocumentClient.from(client);
const GRADI_URL = "https://gradi.ai/api/analyze-video";

async function analyzeWithGradi(youtubeUrl: string, videoId: string): Promise<any> {
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
  if (json.success === false) {
    throw new Error(json.error || "Gradi API returned success: false");
  }
  
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
    console.log("Fetching pending videos from DynamoDB...");
    const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
    const videos = videosRes.Items || [];

    const analysesRes = await ddb.send(new ScanCommand({ TableName: "fep-gradi-analyses", ProjectionExpression: "videoId" }));
    const analyzedIds = new Set((analysesRes.Items || []).map(item => item.videoId));

    // Exclude already graded, manager rated, or marked as no_transcript
    const pendingVideos = videos.filter(v => 
      !analyzedIds.has(v.videoId) && 
      v.status !== "manager_rated" && 
      v.status !== "no_transcript"
    );
    console.log(`Found ${pendingVideos.length} pending videos to analyze.`);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingVideos.length; i++) {
      const v = pendingVideos[i];
      console.log(`[${i+1}/${pendingVideos.length}] Processing "${v.title}" (${v.videoId})...`);
      
      try {
        // Mark as analyzing
        await ddb.send(new UpdateCommand({
          TableName: "fep-videos",
          Key: { facultyId: v.facultyId, videoId: v.videoId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "analyzing" }
        }));

        const analysis = await analyzeWithGradi(v.youtubeUrl, v.videoId);
        
        // Save analysis
        await ddb.send(new PutCommand({
          TableName: "fep-gradi-analyses",
          Item: analysis
        }));

        // Mark as done
        await ddb.send(new UpdateCommand({
          TableName: "fep-videos",
          Key: { facultyId: v.facultyId, videoId: v.videoId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "gradi_done" }
        }));
        
        console.log(`-> Success! Graded.`);
        successCount++;
      } catch (err: any) {
        console.error(`-> Failed: ${err.message}`);
        
        // If it's a transcript or specific Gradi error, mark it as no_transcript so it stops retrying
        if (err.message.includes("transcript") || err.message.includes("success: false") || err.message.includes("missing analysis")) {
          await ddb.send(new UpdateCommand({
            TableName: "fep-videos",
            Key: { facultyId: v.facultyId, videoId: v.videoId },
            UpdateExpression: "SET #s = :s",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": "no_transcript" }
          }));
          console.log("-> Set status to 'no_transcript'");
        }
        failedCount++;
      }
      
      // Delay to avoid hitting API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`Completed. Graded: ${successCount}, Failed/No Transcript: ${failedCount}`);
  } catch (err) {
    console.error("Error in targeted grading script:", err);
  }
}

run();
