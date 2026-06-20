import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const DRY_RUN = false; // Set to false to apply fixes

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

/**
 * This script fixes two issues:
 * 1. ORPHANED RATINGS: Ratings exist for videos that no longer exist in fep-videos.
 *    - These are cleaned up by deleting the stale rating records.
 *
 * 2. MISATTRIBUTED VIDEOS: Videos uploaded under the wrong faculty account.
 *    - For accounts that have 0 videos but should have them (based on manual review),
 *      we migrate videos from the incorrect facultyId to the correct one.
 *
 * Manual review mapping (confirmed by diagnosis):
 *   - Piyush Sanjay Jaiswal (jaiswalpiyush7030) ← from Piyush Kumar Singh (pksraghuvanshi18) ID: 33468338-8c26-4551-884c-997b6e358bc6
 *     BUT: This is a DIFFERENT PERSON — Piyush Kumar Singh is rank 10, Piyush Sanjay Jaiswal is rank 136.
 *     So their videos are correctly attributed to Piyush Kumar Singh, not Piyush Sanjay Jaiswal.
 *     We should NOT migrate those. Piyush Sanjay Jaiswal just hasn't uploaded yet.
 *
 *   - Krishna Kumar Yadav (kyadav42117) ← from Krishna Rajput (kanhiyalodhi657) ID: 99d2ad0a-5367-4be9-809f-daa1fcfe3136
 *     "Krishna Rajput" and "Krishna Kumar Yadav" are two different people.
 *     The videos under "Krishna Rajput" belong to him, not to "Krishna Kumar Yadav".
 *     Krishna Kumar Yadav is likely new and hasn't uploaded yet.
 *
 *   - Sandeep Verma (sv3274821) ← video from Sandeep Kumar — different person. Don't migrate.
 *
 *   - Shivam Singh (shivamchauhan0380) ← Shivam Rishav — different person. Don't migrate.
 *
 *   - Raj Kumar Raju (16btag115) ← Altaf Raja — clearly different person. Don't migrate.
 *
 * CONCLUSION: The 27 zero-video June users simply haven't uploaded any videos yet.
 * The name-based matches were false positives from first-name matching.
 *
 * The PRIMARY fix needed:
 * 1. Clean up 30 orphaned rating records (for 17 deleted videos).
 * 2. Verify that the videos that WERE rated are now displaying properly.
 *
 * The secondary issue: why do rated videos not show manager ratings?
 * Looking at the rating records - they have videoId references that don't exist in fep-videos.
 * This means those videos were previously rated AND THEN deleted (e.g. by delete-garbage-videos.ts).
 * The rated videos that DO exist should still show their ratings correctly.
 */

async function run() {
  console.log(`[DRY_RUN=${DRY_RUN}] Starting repair...`);

  const [videosRes, ratingsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: "fep-videos" })),
    ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" })),
  ]);

  const videos = videosRes.Items ?? [];
  const ratings = ratingsRes.Items ?? [];
  const videoIdSet = new Set(videos.map((v: any) => v.videoId));

  // ── Step 1: Delete orphaned ratings (for videos that no longer exist) ──
  const orphanedRatings = ratings.filter((r: any) => !videoIdSet.has(r.videoId));
  console.log(`\nStep 1: Found ${orphanedRatings.length} orphaned rating records to clean up`);

  for (const r of orphanedRatings) {
    console.log(`  [DELETE RATING] videoId: ${r.videoId}, managerId: ${r.managerId}, score: ${r.total}`);
    if (!DRY_RUN) {
      await ddb.send(new DeleteCommand({
        TableName: "fep-manager-ratings",
        Key: { videoId: r.videoId, managerId: r.managerId },
      }));
    }
  }

  // ── Step 2: Check videos that are marked manager_rated but missing rating record ──
  const ratedVideoIds = new Set(ratings.filter((r: any) => videoIdSet.has(r.videoId)).map((r: any) => r.videoId));
  const videosMarkedRated = videos.filter((v: any) => v.status === "manager_rated");
  const videosMarkedButNoRating = videosMarkedRated.filter((v: any) => !ratedVideoIds.has(v.videoId));
  
  console.log(`\nStep 2: Videos marked 'manager_rated' but missing rating record: ${videosMarkedButNoRating.length}`);
  if (videosMarkedButNoRating.length > 0) {
    // Reset their status so they don't show as rated when they have no rating
    for (const v of videosMarkedButNoRating) {
      console.log(`  [FIX STATUS] "${v.title}" (${v.videoId}) — resetting status to 'gradi_done'`);
      if (!DRY_RUN) {
        await ddb.send(new PutCommand({
          TableName: "fep-videos",
          Item: { ...v, status: v.status === "manager_rated" ? "gradi_done" : v.status },
        }));
      }
    }
  }

  // ── Step 3: Verify the video-rating linkage for rated videos ──
  const videosWithRatings = videos.filter((v: any) => ratedVideoIds.has(v.videoId));
  console.log(`\nStep 3: Videos with valid rating records: ${videosWithRatings.length}`);
  console.log(`  (These should show manager ratings correctly in the dashboard)`);

  // ── Step 4: Final count ──
  console.log(`\n=== REPAIR SUMMARY ===`);
  console.log(`Orphaned rating records deleted: ${orphanedRatings.length}`);
  console.log(`Videos with status fixed: ${videosMarkedButNoRating.length}`);
  console.log(`\nDone!`);
}

run().catch(console.error);
