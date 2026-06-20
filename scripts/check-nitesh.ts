import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

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
  console.log("=== SCANNING VIDEOS FOR NITESH / BLOOD RELATION ===");
  const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const videos = videosRes.Items || [];
  
  const matches = videos.filter(v => 
    (v.title && v.title.toLowerCase().includes("blood relation")) ||
    (v.title && v.title.toLowerCase().includes("narwani")) ||
    (v.facultyName && v.facultyName.toLowerCase().includes("narwani"))
  );
  
  console.log(`Found ${matches.length} matching videos:`);
  for (const v of matches) {
    console.log(JSON.stringify(v, null, 2));
    
    // Find the associated user
    const userRes = await ddb.send(
      new GetCommand({ TableName: "fep-users", Key: { userId: v.facultyId } })
    );
    console.log("Associated User:", JSON.stringify(userRes.Item, null, 2));
    
    // Fetch stats
    const statsRes = await ddb.send(
      new GetCommand({ TableName: "fep-yt-stats", Key: { facultyId: v.facultyId } })
    );
    console.log("YT Stats Cache:", JSON.stringify(statsRes.Item, null, 2));
    console.log("-----------------------------------------");
  }
}

run().catch(console.error);
