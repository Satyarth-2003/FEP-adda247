import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
  const [videosRes, ratingsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: "fep-videos" })),
    ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" })),
  ]);

  const videos = videosRes.Items ?? [];
  const ratings = ratingsRes.Items ?? [];
  const videoIdSet = new Set(videos.map((v: any) => v.videoId));

  // Find all orphaned ratings (ratings whose videoId has no matching video)
  const orphanedRatings = ratings.filter((r: any) => !videoIdSet.has(r.videoId));
  
  // Get unique orphaned videoIds
  const orphanedVideoIds = [...new Set(orphanedRatings.map((r: any) => r.videoId as string))];
  
  console.log(`Orphaned rating records: ${orphanedRatings.length}`);
  console.log(`Unique orphaned videoIds: ${orphanedVideoIds.length}`);
  console.log(`\nThese videoIds have ratings but NO corresponding video in fep-videos:`);
  
  for (const vid of orphanedVideoIds) {
    const ratingRecords = orphanedRatings.filter((r: any) => r.videoId === vid);
    const managerIds = [...new Set(ratingRecords.map((r: any) => r.managerId as string))];
    const total = ratingRecords.find((r: any) => r.managerId === "shared")?.total ?? ratingRecords[0]?.total;
    console.log(`  videoId: ${vid}`);
    console.log(`    managers: ${managerIds.join(", ")}`);
    console.log(`    score: ${total}`);
  }

  // Now check: is there a mismatch where the video exists but under a DIFFERENT facultyId
  // (maybe the rating's facultyId field is different from actual video's facultyId)
  const ratedVideoIds = new Set(ratings.map((r: any) => r.videoId));
  const videosWithRatings = videos.filter((v: any) => ratedVideoIds.has(v.videoId));
  
  console.log(`\n--- Checking faculty visibility for ${videosWithRatings.length} videos that have ratings ---`);
  
  // Look for videos where the video's facultyId doesn't have a user entry
  const usersRes = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const users = usersRes.Items ?? [];
  const userIdSet = new Set(users.map((u: any) => u.userId));
  
  const videosWithBadFacultyId = videos.filter((v: any) => !userIdSet.has(v.facultyId));
  console.log(`Videos with invalid facultyId (no user): ${videosWithBadFacultyId.length}`);
  
  // Check for June users with 0 videos - look if they might have videos under a different name/ID
  const juneUsers = users.filter((u: any) => u.cohort === "June EduSkill");
  const videosByFaculty = new Map<string, any[]>();
  for (const v of videos) {
    const fid = v.facultyId as string;
    if (!videosByFaculty.has(fid)) videosByFaculty.set(fid, []);
    videosByFaculty.get(fid)!.push(v);
  }
  
  const juneUsersNoVideos = juneUsers.filter((u: any) => !videosByFaculty.has(u.userId));
  console.log(`\n--- June EduSkill users with 0 videos (${juneUsersNoVideos.length}) ---`);
  juneUsersNoVideos.forEach((u: any) => {
    console.log(`  ${u.name} (${u.email}) — userId: ${u.userId}`);
  });
  
  // Check if any videos in the table have a facultyName matching these zero-video users
  // (which would indicate the video is under a DIFFERENT userId)
  console.log(`\n--- Checking if any videos exist with matching names for zero-video users ---`);
  for (const u of juneUsersNoVideos) {
    const firstName = (u.name as string).split(" ")[0].toLowerCase();
    const matchingVideos = videos.filter((v: any) => 
      (v.facultyName as string || "").toLowerCase().includes(firstName) && v.facultyId !== u.userId
    );
    if (matchingVideos.length > 0) {
      console.log(`  ${u.name} (${u.email}): found ${matchingVideos.length} videos under different IDs`);
      matchingVideos.slice(0, 2).forEach((v: any) => 
        console.log(`    - "${v.title}" (facultyId: ${v.facultyId}, facultyName: ${v.facultyName})`)
      );
    }
  }
}

run().catch(console.error);
