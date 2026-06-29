import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "dotenv";
config({ path: ".env.local" });

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
);

async function run() {
  const [videosRes, ratingsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: "fep-videos" })),
    ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" })),
  ]);

  const videos = videosRes.Items ?? [];
  const ratings = ratingsRes.Items ?? [];

  const videoMap = new Map(videos.map((v: any) => [v.videoId, v]));
  const statusMismatches: any[] = [];

  for (const r of ratings) {
    const video = videoMap.get(r.videoId);
    if (video && video.status !== "manager_rated") {
      statusMismatches.push({
        videoId: r.videoId,
        title: video.title,
        status: video.status,
        managerName: r.managerName,
        total: r.total,
      });
    }
  }

  console.log(`Total videos in fep-videos: ${videos.length}`);
  console.log(`Total ratings in fep-manager-ratings: ${ratings.length}`);
  console.log(`Found ${statusMismatches.length} rated videos with status mismatch:`);
  console.log(JSON.stringify(statusMismatches, null, 2));
}

run().catch(console.error);
