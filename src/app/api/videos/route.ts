import { NextResponse } from "next/server";
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

// POST — Faculty uploads a video link
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "fep_faculty") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json();
  const { youtubeUrl, subjectId, subject, title } = body;
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
    facultyId: user.userId,
    facultyName: user.name,
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

  // Fire-and-forget Gradi analysis
  (async () => {
    try {
      const analysis = await analyzeWithGradi(youtubeUrl, videoId);
      await ddb.send(
        new PutCommand({ TableName: TABLES.ANALYSES, Item: analysis })
      );
      await ddb.send(
        new UpdateCommand({
          TableName: TABLES.VIDEOS,
          Key: { facultyId: user.userId, videoId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "gradi_done" },
        })
      );
    } catch (e) {
      console.error("Gradi analysis failed for", videoId, e);
    }
  })();

  return NextResponse.json({ video });
}
