import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
  { marshallOptions: { removeUndefinedValues: true } }
);

const GRADI_URL = process.env.GRADI_API_URL || "https://gradi.ai/api/analyze-video";

// Correct video-to-trainee mapping from EduSkill Weekly Review sheet (Best Content)
const CORRECT_MAPPING = [
  { trainee: "Fateh Singh",         video: "Partition Of Punjab",             url: "https://www.youtube.com/watch?v=3WTRlYnneqs" },
  { trainee: "Ankita Selakoti",     video: "Photosynthesis",                  url: "https://www.youtube.com/watch?v=f_x9SObhIgo" },
  { trainee: "Vipin Chandra Bhatt", video: "Lines and Angles",                url: "https://www.youtube.com/watch?v=FDXRil-geUg" },
  { trainee: "shuaib Ansari",       video: "Struggling with BPT — Class 10",  url: "https://www.youtube.com/watch?v=oNsxxcnSjNc" },
  { trainee: "Ankita Selakoti",     video: "Structure of Human Heart",        url: "https://www.youtube.com/watch?v=BsEZUKwGX0o" },
  { trainee: "shuaib Ansari",       video: "Class 10 Polynomials",            url: "https://www.youtube.com/watch?v=fUQexNXsZFA" },
  { trainee: "Kanishka Bakshi",     video: "Nutrition in Animals",            url: "https://www.youtube.com/watch?v=TUlxMGUMAow" },
  { trainee: "Vipin Chandra Bhatt", video: "Percentage",                      url: "https://www.youtube.com/watch?v=07lZl53nxTI" },
  { trainee: "Ankita Selakoti",     video: "Sexual Reproduction in Flowering Plants", url: "https://www.youtube.com/watch?v=dnv8fmaja3E" },
  { trainee: "Shuaib Ansari",       video: "Quadratic Equations One Shot",    url: "https://www.youtube.com/watch?v=c3qba3wItW8" },
  { trainee: "Vipin Chandra Bhatt", video: "Profit And Loss Basic to Advance", url: "https://www.youtube.com/live/jIfPVaVmiFo" },
  { trainee: "Shuaib Ansari",       video: "Coordinate Geometry One Shot",    url: "https://www.youtube.com/watch?v=SIUoouKjkNI" },
  { trainee: "Ankita Selakoti",     video: "Reproductive Health One Shot",    url: "https://www.youtube.com/live/A0xdJXZSC50" },
  { trainee: "Ankita Selakoti",     video: "From Period to Postpartum",       url: "https://www.youtube.com/watch?v=syaQu2Xlr9w" },
  { trainee: "Utkarsh Mishra",      video: "Why the Earth is CONSTANTLY Changing", url: "https://www.youtube.com/watch?v=KcCgmg9gpkc" },
];

function extractYtId(url: string): string | null {
  const m = url.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

async function callGradi(url: string) {
  const res = await fetch(GRADI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtube_url: url, analysis_language: "hinglish", category: null }),
  });
  if (!res.ok) throw new Error(`Gradi ${res.status}`);
  const json = await res.json();
  const a = json?.data?.analysis;
  if (!a) throw new Error("Gradi: missing analysis");
  const r = a.ratings ?? {};
  const get = (k: string) => Number(r[k]?.score ?? 0);
  return {
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

async function findUserByName(name: string): Promise<{ userId: string; name: string } | null> {
  // Try exact match first, then case-insensitive
  const r = await ddb.send(new ScanCommand({
    TableName: "fep-users",
    FilterExpression: "#n = :n OR #n = :n2",
    ExpressionAttributeNames: { "#n": "name" },
    ExpressionAttributeValues: { ":n": name, ":n2": name.toLowerCase() },
  }));
  if (r.Items?.length) return { userId: String(r.Items[0].userId), name: String(r.Items[0].name) };
  
  // Fuzzy match — contains
  const r2 = await ddb.send(new ScanCommand({
    TableName: "fep-users",
    FilterExpression: "contains(#n, :n)",
    ExpressionAttributeNames: { "#n": "name" },
    ExpressionAttributeValues: { ":n": name.split(" ")[0] },
  }));
  const match = r2.Items?.find(u => String(u.name).toLowerCase().includes(name.toLowerCase().split(" ")[0]));
  if (match) return { userId: String(match.userId), name: String(match.name) };
  return null;
}

async function main() {
  // Step 1: Delete ALL existing videos and analyses
  console.log("→ Clearing all existing videos and analyses...");
  const vids = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  for (const v of vids.Items ?? []) {
    await ddb.send(new DeleteCommand({
      TableName: "fep-videos",
      Key: { facultyId: v.facultyId, videoId: v.videoId },
    }));
  }
  console.log(`  Deleted ${vids.Items?.length ?? 0} videos`);

  const analyses = await ddb.send(new ScanCommand({ TableName: "fep-gradi-analyses" }));
  for (const a of analyses.Items ?? []) {
    await ddb.send(new DeleteCommand({
      TableName: "fep-gradi-analyses",
      Key: { videoId: a.videoId },
    }));
  }
  console.log(`  Deleted ${analyses.Items?.length ?? 0} analyses`);

  // Step 2: Re-seed with correct mapping
  console.log(`\n→ Seeding ${CORRECT_MAPPING.length} videos with correct trainee ownership...\n`);

  // Run 3 at a time to not overwhelm Gradi
  for (let i = 0; i < CORRECT_MAPPING.length; i += 3) {
    const batch = CORRECT_MAPPING.slice(i, i + 3);
    await Promise.all(batch.map(async (entry, j) => {
      const idx = i + j + 1;
      const user = await findUserByName(entry.trainee);
      if (!user) {
        console.log(`[${idx}] ✗ Faculty "${entry.trainee}" not found in DB — skipping`);
        return;
      }

      const videoId = uuid();
      const ytId = extractYtId(entry.url);
      await ddb.send(new PutCommand({
        TableName: "fep-videos",
        Item: {
          facultyId: user.userId,
          facultyName: user.name,
          videoId,
          youtubeUrl: entry.url,
          subject: "—",
          subjectId: "foundation",
          title: entry.video,
          thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined,
          uploadedAt: new Date().toISOString(),
          status: "analyzing",
        },
      }));

      try {
        const analysis = await callGradi(entry.url);
        await ddb.send(new PutCommand({
          TableName: "fep-gradi-analyses",
          Item: { videoId, ...analysis },
        }));
        await ddb.send(new UpdateCommand({
          TableName: "fep-videos",
          Key: { facultyId: user.userId, videoId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "gradi_done" },
        }));
        console.log(`[${idx}] ✓ ${user.name.padEnd(22)} → ${entry.video.slice(0, 40).padEnd(40)} Gradi: ${analysis.gradiScore}/5`);
      } catch (e) {
        console.log(`[${idx}] ⚠ ${user.name.padEnd(22)} → ${entry.video.slice(0, 40).padEnd(40)} Gradi failed: ${e instanceof Error ? e.message : e}`);
      }
    }));
  }

  console.log("\nDone. Videos are now correctly mapped to their original creators from the EduSkill sheet.");
}

main().catch(e => { console.error(e); process.exit(1); });
