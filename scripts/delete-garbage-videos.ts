import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
  const res = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const items = res.Items ?? [];
  console.log(`Scanning ${items.length} videos...`);
  
  let deletedCount = 0;
  for (const item of items) {
    if (!item.youtubeUrl) {
      console.log(`\nFound garbage video! VideoId: ${item.videoId} (Faculty: ${item.facultyId})`);
      
      // Check for ratings
      const ratingsRes = await ddb.send(
        new QueryCommand({
          TableName: "fep-manager-ratings",
          KeyConditionExpression: "videoId = :v",
          ExpressionAttributeValues: { ":v": item.videoId },
        })
      );
      const ratings = ratingsRes.Items ?? [];
      console.log(`- Ratings count: ${ratings.length}`);
      
      // Delete ratings
      for (const r of ratings) {
        await ddb.send(
          new DeleteCommand({
            TableName: "fep-manager-ratings",
            Key: { videoId: r.videoId, managerId: r.managerId },
          })
        );
        console.log(`  * Deleted rating for manager ${r.managerId}`);
      }

      // Delete video
      await ddb.send(
        new DeleteCommand({
          TableName: "fep-videos",
          Key: { facultyId: item.facultyId, videoId: item.videoId },
        })
      );
      console.log(`- Deleted video from fep-videos.`);
      deletedCount++;
    }
  }
  console.log(`\nDone. Cleaned up ${deletedCount} garbage videos.`);
}

run();
