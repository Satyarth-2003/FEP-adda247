import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

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
  console.log("=== AGGREGATING STATS FROM DB VIDEOS TO YT_STATS CACHE ===");
  
  // 1. Scan all videos
  const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
  const videos = videosRes.Items ?? [];
  console.log(`Loaded ${videos.length} videos.`);

  // 2. Group by facultyId
  const byFaculty: Record<string, { views: number; likes: number }> = {};
  for (const v of videos) {
    const fId = v.facultyId;
    if (!fId) continue;
    if (!byFaculty[fId]) {
      byFaculty[fId] = { views: 0, likes: 0 };
    }
    byFaculty[fId].views += v.views ?? 0;
    byFaculty[fId].likes += v.likes ?? 0;
  }

  // 3. Scan all users to get all facultyIds
  const usersRes = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const faculties = (usersRes.Items ?? []).filter(u => u.role === "eduskill_faculty");
  console.log(`Loaded ${faculties.length} faculty users.`);

  // 4. Update fep-yt-stats
  let updatedCount = 0;
  const syncedAt = new Date().toISOString();

  for (const f of faculties) {
    const fId = f.userId;
    const computed = byFaculty[fId] ?? { views: 0, likes: 0 };
    
    // Get existing cached stats to preserve subscriber count
    const existingRes = await ddb.send(
      new GetCommand({ TableName: "fep-yt-stats", Key: { facultyId: fId } })
    );
    const existing = existingRes.Item ?? {};
    
    let views = computed.views;
    let likes = computed.likes;
    let subscribers = existing.subscribers ?? 0;
    let channelId = existing.channelId ?? "";

    // If computed stats are 0 but existing cache has values, preserve them
    if (views === 0 && existing.totalViews) views = existing.totalViews;
    if (likes === 0 && existing.totalLikes) likes = existing.totalLikes;

    await ddb.send(
      new PutCommand({
        TableName: "fep-yt-stats",
        Item: {
          facultyId: fId,
          totalViews: views,
          totalLikes: likes,
          subscribers,
          channelId,
          syncedAt,
        },
      })
    );
    console.log(`Updated stats for ${f.name} (${fId}): Views: ${views}, Likes: ${likes}, Subs: ${subscribers}`);
    updatedCount++;
  }

  console.log(`\n=== COMPLETED: Updated ${updatedCount} faculty stats in fep-yt-stats table. ===`);
}

run();
