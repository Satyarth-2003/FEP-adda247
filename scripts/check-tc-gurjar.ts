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
  const usersRes = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const ratingsRes = await ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" }));

  const users = usersRes.Items || [];
  const videos = videosRes.Items || [];
  const ratings = ratingsRes.Items || [];

  const tcUsers = users.filter(u => String(u.email ?? "").toLowerCase().includes("gurjar") || String(u.name ?? "").toLowerCase().includes("gurjar"));
  console.log("TC Gurjar Users in DB:");
  console.log(JSON.stringify(tcUsers, null, 2));

  const tcUserIds = new Set(tcUsers.map(u => u.userId));
  const tcVideos = videos.filter(v => tcUserIds.has(v.facultyId) || String(v.facultyName ?? "").toLowerCase().includes("gurjar") || String(v.title ?? "").toLowerCase().includes("gurjar"));
  console.log(`\nTC Gurjar Videos in DB (${tcVideos.length}):`);
  console.log(tcVideos.map(v => ({ videoId: v.videoId, facultyId: v.facultyId, facultyName: v.facultyName, title: v.title, status: v.status, url: v.youtubeUrl })));

  const tcVideoIds = new Set(tcVideos.map(v => v.videoId));
  const tcRatings = ratings.filter(r => tcVideoIds.has(r.videoId));
  console.log(`\nTC Gurjar Ratings in DB (${tcRatings.length}):`);
  console.log(tcRatings);
}

run().catch(console.error);
