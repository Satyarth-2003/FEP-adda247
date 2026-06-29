import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
);

async function run() {
  const [usersRes, videosRes, ratingsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: "fep-users" })),
    ddb.send(new ScanCommand({ TableName: "fep-videos" })),
    ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" })),
  ]);

  const users = usersRes.Items ?? [];
  const videos = videosRes.Items ?? [];
  const ratings = ratingsRes.Items ?? [];

  const oldUserId = "0a6e572f-aaff-40d1-b228-01d91ac1c194";
  const newUserId = "d6ae288e-28b6-48bb-aae3-72f0b12d799e";

  console.log("=== USERS ===");
  const gurjarUsers = users.filter(u => u.userId === oldUserId || u.userId === newUserId || String(u.name).toLowerCase().includes("gurjar") || String(u.email).toLowerCase().includes("gurjar"));
  console.log(JSON.stringify(gurjarUsers, null, 2));

  console.log("\n=== VIDEOS ===");
  const gurjarVideos = videos.filter(v => v.facultyId === oldUserId || v.facultyId === newUserId || String(v.facultyName).toLowerCase().includes("gurjar"));
  console.log(JSON.stringify(gurjarVideos.map(v => ({ videoId: v.videoId, facultyId: v.facultyId, title: v.title, youtubeUrl: v.youtubeUrl, status: v.status })), null, 2));

  console.log("\n=== RATINGS FOR OLD VIDEO IDs ===");
  // Let's see if we have any ratings pointing to video IDs that were owned by the old user
  const oldUserVideoIds = new Set(videos.filter(v => v.facultyId === oldUserId).map(v => v.videoId));
  const oldRatings = ratings.filter(r => oldUserVideoIds.has(r.videoId) || r.managerId === oldUserId);
  console.log(JSON.stringify(oldRatings, null, 2));

  console.log("\n=== RATINGS FOR ALL VIDEOS ===");
  const gurjarVideoIds = new Set(gurjarVideos.map(v => v.videoId));
  const gurjarRatings = ratings.filter(r => gurjarVideoIds.has(r.videoId) || r.managerId === oldUserId || r.managerId === newUserId);
  console.log(JSON.stringify(gurjarRatings, null, 2));
}

run().catch(console.error);
