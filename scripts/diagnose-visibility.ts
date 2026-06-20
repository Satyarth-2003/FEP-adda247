import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
  { marshallOptions: { removeUndefinedValues: true } }
);

async function run() {
  console.log("Scanning all tables...\n");

  const [usersRes, videosRes, ratingsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: "fep-users" })),
    ddb.send(new ScanCommand({ TableName: "fep-videos" })),
    ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" })),
  ]);

  const users = usersRes.Items ?? [];
  const videos = videosRes.Items ?? [];
  const ratings = ratingsRes.Items ?? [];

  const userIdSet = new Set(users.map((u: any) => u.userId));
  const videoIdSet = new Set(videos.map((v: any) => v.videoId));

  console.log(`=== COUNTS ===`);
  console.log(`Users in DB: ${users.length}`);
  console.log(`Videos in DB: ${videos.length}`);
  console.log(`Ratings in DB: ${ratings.length}`);

  // Find videos whose facultyId doesn't match any user
  const orphanedVideos = videos.filter((v: any) => !userIdSet.has(v.facultyId));
  console.log(`\n=== ORPHANED VIDEOS (facultyId not found in fep-users) ===`);
  console.log(`Count: ${orphanedVideos.length}`);
  if (orphanedVideos.length > 0) {
    // Group by orphaned facultyId
    const byFacultyId = new Map<string, any[]>();
    for (const v of orphanedVideos) {
      if (!byFacultyId.has(v.facultyId)) byFacultyId.set(v.facultyId, []);
      byFacultyId.get(v.facultyId)!.push(v);
    }
    for (const [fid, vids] of byFacultyId.entries()) {
      console.log(`  facultyId: ${fid} (${vids[0]?.facultyName ?? "unknown"}) — ${vids.length} videos orphaned`);
      vids.slice(0, 3).forEach((v: any) => console.log(`    - "${v.title}" (${v.videoId})`));
      if (vids.length > 3) console.log(`    ... and ${vids.length - 3} more`);
    }
  }

  // Find ratings whose videoId doesn't match any video
  const orphanedRatings = ratings.filter((r: any) => !videoIdSet.has(r.videoId));
  console.log(`\n=== ORPHANED RATINGS (videoId not found in fep-videos) ===`);
  console.log(`Count: ${orphanedRatings.length}`);
  if (orphanedRatings.length > 0) {
    orphanedRatings.slice(0, 20).forEach((r: any) =>
      console.log(`  videoId: ${r.videoId}, managerId: ${r.managerId}, total: ${r.total}`)
    );
    if (orphanedRatings.length > 20) console.log(`  ... and ${orphanedRatings.length - 20} more`);
  }

  // Find users in June cohort with 0 videos
  const juneUsers = users.filter((u: any) => u.cohort === "June EduSkill");
  const videosByFacultyId = new Map<string, any[]>();
  for (const v of videos) {
    if (!videosByFacultyId.has(v.facultyId)) videosByFacultyId.set(v.facultyId, []);
    videosByFacultyId.get(v.facultyId)!.push(v);
  }
  
  const juneUsersWithVideos = juneUsers.filter((u: any) => (videosByFacultyId.get(u.userId)?.length ?? 0) > 0);
  const juneUsersNoVideos = juneUsers.filter((u: any) => (videosByFacultyId.get(u.userId)?.length ?? 0) === 0);

  console.log(`\n=== JUNE COHORT STATS ===`);
  console.log(`Total June users: ${juneUsers.length}`);
  console.log(`June users WITH videos: ${juneUsersWithVideos.length}`);
  console.log(`June users WITH NO videos: ${juneUsersNoVideos.length}`);
  
  // Check ratings whose managerId (used as facultyId in some records) doesn't exist
  const ratingsByVideoId = new Map<string, any[]>();
  for (const r of ratings) {
    if (!ratingsByVideoId.has(r.videoId)) ratingsByVideoId.set(r.videoId, []);
    ratingsByVideoId.get(r.videoId)!.push(r);
  }

  // Videos in DB that have no ratings
  const ratedVideoIds = new Set(ratings.map((r: any) => r.videoId));
  const videosWithRatings = videos.filter((v: any) => ratedVideoIds.has(v.videoId));
  const videosWithStatus = videos.filter((v: any) => v.status === "manager_rated");
  
  console.log(`\n=== RATING HEALTH ===`);
  console.log(`Videos with at least one rating: ${videosWithRatings.length}`);
  console.log(`Videos with status=manager_rated: ${videosWithStatus.length}`);
  
  // Videos marked manager_rated but no actual rating record
  const markedButNoRating = videosWithStatus.filter((v: any) => !ratedVideoIds.has(v.videoId));
  console.log(`Videos marked manager_rated but have NO rating record: ${markedButNoRating.length}`);
  if (markedButNoRating.length > 0) {
    markedButNoRating.slice(0, 10).forEach((v: any) =>
      console.log(`  "${v.title}" — facultyId: ${v.facultyId}`)
    );
  }

  // Ratings for videos that DO exist in a different facultyId
  // (This catches when a video was re-keyed but ratings still reference old videoId)
  console.log(`\n=== SUMMARY ===`);
  console.log(`Orphaned videos needing repair: ${orphanedVideos.length}`);
  console.log(`Orphaned ratings needing repair: ${orphanedRatings.length}`);
  console.log(`Videos marked_rated but missing rating record: ${markedButNoRating.length}`);
}

run().catch(console.error);
