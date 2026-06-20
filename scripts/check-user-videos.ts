import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
  const user = (usersRes.Items ?? []).find(u => u.email === "pramilayaduvanshi0@gmail.com");
  if (!user) {
    console.log("User not found!");
    return;
  }
  console.log("User details:", JSON.stringify(user, null, 2));

  const videosRes = await ddb.send(
    new QueryCommand({
      TableName: "fep-videos",
      KeyConditionExpression: "facultyId = :f",
      ExpressionAttributeValues: { ":f": user.userId },
    })
  );
  console.log("\nVideos:", JSON.stringify(videosRes.Items, null, 2));

  // Check cached YT stats
  const ytRes = await ddb.send(
    new QueryCommand({
      TableName: "fep-yt-stats",
      KeyConditionExpression: "facultyId = :f",
      ExpressionAttributeValues: { ":f": user.userId },
    })
  );
  console.log("\nCached YT Stats:", JSON.stringify(ytRes.Items, null, 2));
}

run();
