import { NextResponse, after } from "next/server";
import { v4 as uuid } from "uuid";
import {
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import { extractYouTubeId, youtubeThumb } from "@/lib/utils";
import { analyzeWithGradi } from "@/lib/gradi";
import type { Video } from "@/types";

// GET — list videos. Faculty: own only. Manager: all (filterable).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const facultyId = searchParams.get("facultyId");
  const subjectId = searchParams.get("subjectId");

  if (user.role === "fep_faculty") {
    const r = await ddb.send(
      new QueryCommand({
        TableName: TABLES.VIDEOS,
        KeyConditionExpression: "facultyId = :f",
        ExpressionAttributeValues: { ":f": user.userId },
      })
    );
    return NextResponse.json({ videos: r.Items ?? [] });
  }

  // Manager
  if (facultyId) {
    const r = await ddb.send(
      new QueryCommand({
        TableName: TABLES.VIDEOS,
        KeyConditionExpression: "facultyId = :f",
        ExpressionAttributeValues: { ":f": facultyId },
      })
    );
    return NextResponse.json({ videos: r.Items ?? [] });
  }
  if (subjectId) {
    const r = await ddb.send(
      new QueryCommand({
        TableName: TABLES.VIDEOS,
        IndexName: "subjectId-uploadedAt-index",
        KeyConditionExpression: "subjectId = :s",
        ExpressionAttributeValues: { ":s": subjectId },
        ScanIndexForward: false,
      })
    );
    return NextResponse.json({ videos: r.Items ?? [] });
  }

  const r = await ddb.send(new ScanCommand({ TableName: TABLES.VIDEOS }));
  return NextResponse.json({ videos: r.Items ?? [] });
}

// POST — Upload a video link (faculty for themselves, or manager on behalf of a faculty)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const { youtubeUrl, subjectId, subject, title, facultyId: assignToFacultyId } = body;

  // Determine target faculty
  let targetFacultyId = user.userId;
  let targetFacultyName = user.name;

  if (user.role === "fep_manager") {
    // Manager can assign to any faculty
    if (assignToFacultyId) {
      targetFacultyId = assignToFacultyId;
      // Look up name (optional optimization — skip if not critical)
      targetFacultyName = body.facultyName ?? assignToFacultyId;
    } else {
      return NextResponse.json(
        { error: "Manager must specify facultyId to assign the video" },
        { status: 400 }
      );
    }
  } else if (user.role !== "fep_faculty") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!youtubeUrl || !subjectId || !title) {
    return NextResponse.json(
      { error: "youtubeUrl, subjectId, title required" },
      { status: 400 }
    );
  }
  if (!extractYouTubeId(youtubeUrl)) {
    return NextResponse.json(
      { error: "Invalid YouTube URL" },
      { status: 400 }
    );
  }

  const videoId = uuid();
  const video: Video = {
    facultyId: targetFacultyId,
    facultyName: targetFacultyName,
    videoId,
    youtubeUrl,
    subject: subject ?? subjectId,
    subjectId,
    title,
    thumbnailUrl: youtubeThumb(youtubeUrl) ?? undefined,
    uploadedAt: new Date().toISOString(),
    status: "analyzing",
  };

  await ddb.send(new PutCommand({ TableName: TABLES.VIDEOS, Item: video }));

  // Schedule Gradi analysis to run AFTER the response is sent.
  // `after()` works on Vercel (the runtime keeps the function alive) and locally.
  after(async () => {
    try {
      const analysis = await analyzeWithGradi(youtubeUrl, videoId);
      await ddb.send(
        new PutCommand({ TableName: TABLES.ANALYSES, Item: analysis })
      );
      await ddb.send(
        new UpdateCommand({
          TableName: TABLES.VIDEOS,
          Key: { facultyId: targetFacultyId, videoId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "gradi_done" },
        })
      );
    } catch (e) {
      console.error("Gradi analysis failed for", videoId, e);
    }
  });

  return NextResponse.json({ video });
}
