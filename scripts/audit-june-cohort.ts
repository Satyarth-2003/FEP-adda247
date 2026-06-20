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
  const [usersRes, videosRes, ratingsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: "fep-users" })),
    ddb.send(new ScanCommand({ TableName: "fep-videos" })),
    ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" })),
  ]);

  const users = usersRes.Items ?? [];
  const videos = videosRes.Items ?? [];
  const ratings = ratingsRes.Items ?? [];

  // Build map: facultyId -> videos
  const videosByFacultyId = new Map<string, any[]>();
  for (const v of videos) {
    const fid = v.facultyId as string;
    if (!videosByFacultyId.has(fid)) videosByFacultyId.set(fid, []);
    videosByFacultyId.get(fid)!.push(v);
  }

  // Build map: videoId -> ratings
  const ratingsByVideoId = new Map<string, any[]>();
  for (const r of ratings) {
    const vid = r.videoId as string;
    if (!ratingsByVideoId.has(vid)) ratingsByVideoId.set(vid, []);
    ratingsByVideoId.get(vid)!.push(r);
  }

  const juneUsers = users.filter((u: any) => u.cohort === "June EduSkill");
  
  console.log(`=== Full June Cohort Status (${juneUsers.length} users) ===\n`);
  
  let usersWithVideos = 0;
  let usersWithRatedVideos = 0;
  
  for (const u of juneUsers) {
    const userVideos = videosByFacultyId.get(u.userId) ?? [];
    const ratedVideos = userVideos.filter(v => ratingsByVideoId.has(v.videoId));
    
    if (userVideos.length > 0) usersWithVideos++;
    if (ratedVideos.length > 0) usersWithRatedVideos++;
    
    const line = `  ${u.name.padEnd(35)} | ${u.email.padEnd(40)} | videos: ${String(userVideos.length).padStart(3)} | rated: ${String(ratedVideos.length).padStart(3)}`;
    console.log(line);
  }

  console.log(`\n=== TOTALS ===`);
  console.log(`Users with >= 1 video: ${usersWithVideos} / ${juneUsers.length}`);
  console.log(`Users with >= 1 rated video: ${usersWithRatedVideos} / ${juneUsers.length}`);

  // Check if there are any videos in DB whose facultyId is NOT in the June cohort user list at all
  const juneUserIds = new Set(juneUsers.map((u: any) => u.userId));
  const allUserIds = new Set(users.map((u: any) => u.userId));

  const videosFacultyIds = new Set(videos.map((v: any) => v.facultyId as string));
  
  // Videos whose facultyId is not even in fep-users at all
  const totallyOrphanedFids = [...videosFacultyIds].filter(fid => !allUserIds.has(fid));
  console.log(`\nVideo facultyIds with NO user at all: ${totallyOrphanedFids.length}`);
  for (const fid of totallyOrphanedFids) {
    const vids = videosByFacultyId.get(fid) ?? [];
    console.log(`  ${fid}: ${vids.length} videos, e.g. "${vids[0]?.title}" by "${vids[0]?.facultyName}"`);
  }
}

run().catch(console.error);
