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
  const res = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const items = res.Items ?? [];
  console.log(`Checking ${items.length} videos...`);
  for (const item of items) {
    const isInvalidTitle = item.title === "Invalid Date" || item.title === "undefined" || !item.title;
    const d = new Date(item.uploadedAt);
    const isInvalidDate = !item.uploadedAt || item.uploadedAt === "undefined" || isNaN(d.getTime());
    if (isInvalidTitle || isInvalidDate) {
      console.log(`Mismatch/Invalid video:`, JSON.stringify(item, null, 2));
    }
  }
}

run();
