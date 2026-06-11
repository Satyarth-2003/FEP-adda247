import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const ddb = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

async function main() {
  console.log("🧹 Cleaning up test accounts (@fep.local)...\n");

  // 1. Find all @fep.local users
  const usersRes = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const allUsers = usersRes.Items ?? [];
  const testUsers = allUsers.filter(u => 
    (u.email as string)?.includes("@fep.local")
  );

  if (testUsers.length === 0) {
    console.log("✓ No @fep.local accounts found. Already clean.");
    return;
  }

  console.log(`Found ${testUsers.length} test accounts to remove:`);
  for (const u of testUsers) {
    console.log(`  - ${u.name} (${u.email}) [${u.role}]`);
  }

  const testUserIds = new Set(testUsers.map(u => u.userId as string));

  // 2. Delete videos uploaded by test accounts
  const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const testVideos = (videosRes.Items ?? []).filter(v => testUserIds.has(v.facultyId as string));
  console.log(`\n→ Removing ${testVideos.length} videos from test accounts...`);
  for (const v of testVideos) {
    await ddb.send(new DeleteCommand({ TableName: "fep-videos", Key: { facultyId: v.facultyId, videoId: v.videoId } }));
    // Also delete analysis
    try {
      await ddb.send(new DeleteCommand({ TableName: "fep-gradi-analyses", Key: { videoId: v.videoId } }));
    } catch { /* may not exist */ }
    // Delete ratings for this video
    try {
      const ratingsRes = await ddb.send(new QueryCommand({
        TableName: "fep-manager-ratings",
        KeyConditionExpression: "videoId = :v",
        ExpressionAttributeValues: { ":v": v.videoId },
      }));
      for (const r of ratingsRes.Items ?? []) {
        await ddb.send(new DeleteCommand({ TableName: "fep-manager-ratings", Key: { videoId: r.videoId, managerId: r.managerId } }));
      }
    } catch { /* may not exist */ }
  }

  // 3. Delete ratings made by test manager accounts
  const ratingsRes = await ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" }));
  const testRatings = (ratingsRes.Items ?? []).filter(r => testUserIds.has(r.managerId as string));
  console.log(`→ Removing ${testRatings.length} ratings made by test managers...`);
  for (const r of testRatings) {
    await ddb.send(new DeleteCommand({ TableName: "fep-manager-ratings", Key: { videoId: r.videoId, managerId: r.managerId } }));
  }

  // 4. Delete the test user accounts themselves
  console.log(`→ Removing ${testUsers.length} user accounts...`);
  for (const u of testUsers) {
    await ddb.send(new DeleteCommand({ TableName: "fep-users", Key: { userId: u.userId } }));
  }

  console.log(`\n✓ Cleanup complete. Removed ${testUsers.length} accounts, ${testVideos.length} videos, ${testRatings.length} ratings.`);
  console.log("\nRemaining accounts are all official (@gmail.com / @adda247.com).");
}

main().catch(e => {
  console.error("Cleanup failed:", e);
  process.exit(1);
});
