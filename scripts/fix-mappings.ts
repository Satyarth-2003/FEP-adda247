import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

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

interface VideoItem {
  facultyId: string;
  facultyName?: string;
  videoId: string;
  title: string;
  youtubeUrl: string;
  subject: string;
  subjectId: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  status: string;
  [k: string]: unknown;
}

// Pairs to swap by faculty name
const SWAPS: [string, string][] = [
  ["Brijesh Kumar", "Gyanendra Tiwari"],
  // Add more pairs here if needed
];

async function main() {
  const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const all = (videosRes.Items ?? []) as VideoItem[];

  for (const [nameA, nameB] of SWAPS) {
    const a = all.find(v => v.facultyName === nameA);
    const b = all.find(v => v.facultyName === nameB);
    if (!a || !b) {
      console.log(`✗ Could not find both videos for ${nameA} ↔ ${nameB}`);
      continue;
    }

    console.log(`Swapping:`);
    console.log(`  ${nameA} (${a.title}) ↔ ${nameB} (${b.title})`);

    // Delete both originals
    await ddb.send(
      new DeleteCommand({
        TableName: "fep-videos",
        Key: { facultyId: a.facultyId, videoId: a.videoId },
      })
    );
    await ddb.send(
      new DeleteCommand({
        TableName: "fep-videos",
        Key: { facultyId: b.facultyId, videoId: b.videoId },
      })
    );

    // Re-insert with swapped video content (keep their own videoIds and subject/vertical context)
    // Actually the cleanest swap: A keeps videoId but takes B's title/url, and vice versa.
    // This way Gradi analyses (keyed by videoId) still match the right URL/title.
    // But analyses are keyed by videoId, so swapping titles would mismatch the existing analyses.
    //
    // Better strategy: swap facultyId/facultyName instead — Gradi analyses stay correct,
    // each video keeps its own analysis, just owned by the other faculty.
    await ddb.send(
      new PutCommand({
        TableName: "fep-videos",
        Item: {
          ...a,
          facultyId: b.facultyId,
          facultyName: b.facultyName,
        },
      })
    );
    await ddb.send(
      new PutCommand({
        TableName: "fep-videos",
        Item: {
          ...b,
          facultyId: a.facultyId,
          facultyName: a.facultyName,
        },
      })
    );
    console.log(`  ✓ Swapped facultyId — analyses remain attached`);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("Fix failed:", e);
  process.exit(1);
});
