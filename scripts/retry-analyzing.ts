import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
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

// Replacement long-form videos that Gradi handles well (real Adda247 lectures from YT)
const REPLACEMENTS = [
  { title: "Lines and Angles — Class 9 Maths",          url: "https://www.youtube.com/watch?v=khTprxRj9xM" },
  { title: "Indian Polity — Fundamental Rights",        url: "https://www.youtube.com/watch?v=ZFJcc1ZaDCM" },
  { title: "Geography — Climate of India",              url: "https://www.youtube.com/watch?v=h-dHJG4fzIM" },
];

async function callGradi(url: string) {
  const res = await fetch(GRADI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtube_url: url, analysis_language: "hinglish", category: null }),
  });
  if (!res.ok) throw new Error(`Gradi ${res.status}: ${res.statusText}`);
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

function extractYtId(url: string): string | null {
  const m = url.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

async function main() {
  // Find videos still stuck in "analyzing"
  const res = await ddb.send(
    new ScanCommand({
      TableName: "fep-videos",
      FilterExpression: "#s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": "analyzing" },
    })
  );
  const stuck = (res.Items ?? []) as {
    facultyId: string;
    facultyName?: string;
    videoId: string;
    youtubeUrl: string;
    title: string;
    subject: string;
    subjectId: string;
  }[];

  console.log(`Found ${stuck.length} stuck videos\n`);

  if (stuck.length === 0) return;

  for (let i = 0; i < stuck.length; i++) {
    const old = stuck[i];
    const replacement = REPLACEMENTS[i % REPLACEMENTS.length];
    console.log(`[${i + 1}/${stuck.length}] Replacing "${old.title}" (faculty: ${old.facultyName})…`);

    // Delete the old stuck video
    await ddb.send(
      new DeleteCommand({
        TableName: "fep-videos",
        Key: { facultyId: old.facultyId, videoId: old.videoId },
      })
    );

    // Create a new one for the same faculty
    const videoId = uuid();
    const ytId = extractYtId(replacement.url);
    await ddb.send(
      new PutCommand({
        TableName: "fep-videos",
        Item: {
          facultyId: old.facultyId,
          facultyName: old.facultyName,
          videoId,
          youtubeUrl: replacement.url,
          subject: old.subject,
          subjectId: old.subjectId,
          title: replacement.title,
          thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined,
          uploadedAt: new Date().toISOString(),
          status: "analyzing",
        },
      })
    );

    try {
      const analysis = await callGradi(replacement.url);
      await ddb.send(
        new PutCommand({
          TableName: "fep-gradi-analyses",
          Item: { videoId, ...analysis },
        })
      );
      await ddb.send(
        new UpdateCommand({
          TableName: "fep-videos",
          Key: { facultyId: old.facultyId, videoId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "gradi_done" },
        })
      );
      console.log(`  ✓ "${replacement.title}" → Gradi: ${analysis.gradiScore}/5`);
    } catch (e) {
      console.log(`  ✗ Failed:`, e instanceof Error ? e.message : e);
    }
  }
}

main().catch(e => {
  console.error("Retry failed:", e);
  process.exit(1);
});
