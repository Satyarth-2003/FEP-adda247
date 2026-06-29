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

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function run() {
  const [usersRes, videosRes, ratingsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: "fep-users" })),
    ddb.send(new ScanCommand({ TableName: "fep-videos" })),
    ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" })),
  ]);

  const users = usersRes.Items ?? [];
  const videos = videosRes.Items ?? [];
  const ratings = ratingsRes.Items ?? [];

  console.log(`Loaded ${users.length} users, ${videos.length} videos, ${ratings.length} ratings.`);

  // Map videos by YouTube ID
  const activeVideosByYtId = new Map<string, any>();
  for (const v of videos) {
    const ytId = extractYouTubeId(v.youtubeUrl);
    if (ytId) {
      if (!activeVideosByYtId.has(ytId)) {
        activeVideosByYtId.set(ytId, []);
      }
      activeVideosByYtId.get(ytId).push(v);
    }
  }

  // Look for ratings that are "lost" because they refer to a videoId that is not the active one
  // or because the videoId in fep-videos was replaced/deleted, but the rating might still exist?
  // Wait, we found 0 orphaned ratings. This means all ratings currently in fep-manager-ratings
  // refer to a videoId that exists in fep-videos.
  // But wait! Is it possible that the rating is mapped to a duplicate video that was kept,
  // but the user's dashboard only shows the other duplicate video that is unscored?
  // Let's check if there are duplicate videos in fep-videos for the same YouTube ID!
  let duplicateGroupsCount = 0;
  for (const [ytId, list] of activeVideosByYtId.entries()) {
    if (list.length > 1) {
      duplicateGroupsCount++;
      console.log(`\nDuplicate Group for YT ID ${ytId} (Count: ${list.length}):`);
      for (const v of list) {
        const vRatings = ratings.filter((r: any) => r.videoId === v.videoId);
        console.log(`  - VideoId: ${v.videoId}, Title: "${v.title}", Status: ${v.status}, FacultyName: ${v.facultyName}, RatingsCount: ${vRatings.length}`);
      }
    }
  }
  console.log(`\nFound ${duplicateGroupsCount} groups of duplicate videos in fep-videos.`);
}

run().catch(console.error);
