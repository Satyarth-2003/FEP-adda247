import { NextResponse, after } from "next/server";
import { v4 as uuid } from "uuid";
import {
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import { extractYouTubeId, youtubeThumb } from "@/lib/utils";
import { analyzeWithGradi, processPendingQueue } from "@/lib/gradi";
import type { Video } from "@/types";

// GET — list videos. Faculty: own only. Manager: all (filterable).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const facultyId = searchParams.get("facultyId");
  const subjectId = searchParams.get("subjectId");

  if (user.role === "eduskill_faculty") {
    const r = await ddb.send(
      new QueryCommand({
        TableName: TABLES.VIDEOS,
        KeyConditionExpression: "facultyId = :f",
        ExpressionAttributeValues: { ":f": user.userId },
      })
    );
    const videos = r.Items ?? [];
    processPendingQueue();
    return NextResponse.json({ videos });
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
    const videos = r.Items ?? [];
    processPendingQueue();
    return NextResponse.json({ videos });
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
    const videos = r.Items ?? [];
    processPendingQueue();
    return NextResponse.json({ videos });
  }

  const r = await ddb.send(new ScanCommand({ TableName: TABLES.VIDEOS }));
  const videos = r.Items ?? [];
  processPendingQueue();
  return NextResponse.json({ videos });
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

  if (user.role === "eduskill_manager" || user.role === "eduskill_admin") {
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
  } else if (user.role !== "eduskill_faculty") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!youtubeUrl) {
    return NextResponse.json(
      { error: "youtubeUrl required" },
      { status: 400 }
    );
  }
  const newYtId = extractYouTubeId(youtubeUrl);
  if (!newYtId) {
    return NextResponse.json(
      { error: "Invalid YouTube URL" },
      { status: 400 }
    );
  }

  // Prevent uploading the same video twice
  const scanRes = await ddb.send(
    new ScanCommand({
      TableName: TABLES.VIDEOS,
      ProjectionExpression: "youtubeUrl",
    })
  );
  const existingVideos = (scanRes.Items ?? []) as { youtubeUrl: string }[];
  const isDuplicate = existingVideos.some((v) => {
    const existingId = extractYouTubeId(v.youtubeUrl);
    return existingId === newYtId;
  });

  if (isDuplicate) {
    return NextResponse.json(
      { error: "This video has already been uploaded." },
      { status: 400 }
    );
  }

  // Auto-assign subject from faculty's profile if not provided
  let resolvedSubjectId = subjectId || "";
  let resolvedSubject = subject || "";
  let resolvedTitle = title || "Untitled Video";

  if (!resolvedSubjectId) {
    // Look up faculty's subjects from their user profile
    const userRes = await ddb.send(new GetCommand({ TableName: TABLES.USERS, Key: { userId: targetFacultyId } }));
    const facultyUser = userRes.Item;
    if (facultyUser) {
      if (!targetFacultyName || targetFacultyName === targetFacultyId) {
        targetFacultyName = (facultyUser.name as string) ?? targetFacultyId;
      }
      const userSubjects = (facultyUser.subjects as string[]) ?? [];
      if (userSubjects.length > 0) {
        resolvedSubjectId = userSubjects[0];
        resolvedSubject = resolvedSubjectId;
      }
      // Fallback: infer from examTarget/teachingSubject
      if (!resolvedSubjectId) {
        const examTarget = ((facultyUser.examTarget as string) ?? "").toLowerCase();
        const teachingSub = ((facultyUser.teachingSubject as string) ?? "").toLowerCase();
        const combined = examTarget + " " + teachingSub;
        if (combined.includes("ssc") || combined.includes("one day")) resolvedSubjectId = "ssc";
        else if (combined.includes("neet") || combined.includes("biology") || combined.includes("zoology")) resolvedSubjectId = "neet";
        else if (combined.includes("banking") || combined.includes("bank") || combined.includes("insurance")) resolvedSubjectId = "banking";
        else if (combined.includes("upsc") || combined.includes("psc") || combined.includes("civil service")) resolvedSubjectId = "upsc";
        else if (combined.includes("railway") || combined.includes("rrb")) resolvedSubjectId = "railway";
        else if (combined.includes("cuet")) resolvedSubjectId = "cuet";
        else if (combined.includes("ugc") || combined.includes("net")) resolvedSubjectId = "ugc-net";
        else if (combined.includes("teaching") || combined.includes("ctet") || combined.includes("tet") || combined.includes("cdp")) resolvedSubjectId = "teaching";
        else if (combined.includes("nursing")) resolvedSubjectId = "nursing";
        else if (combined.includes("gate") || combined.includes("engineering") || combined.includes("iti") || combined.includes("jee")) resolvedSubjectId = "tech";
        else if (combined.includes("foundation") || combined.includes("class") || combined.includes("academic") || combined.includes("board")) resolvedSubjectId = "foundation";
        else resolvedSubjectId = "ssc"; // default fallback
        resolvedSubject = resolvedSubjectId;
    }
  }
}
const YT_API_KEY = "AIzaSyB7u1Gb5DbKiI_LgLBAsnfjG4JouBkTpAs";

  async function fetchYouTubeMetadata(youtubeUrl: string) {
    const ytId = extractYouTubeId(youtubeUrl);
    if (!ytId) return null;
    try {
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${ytId}&key=${YT_API_KEY}`
      );
      const ytData = await ytRes.json();
      if (!ytData.items?.length) return null;
      const item = ytData.items[0];
      const stats = item.statistics || {};
      const details = item.contentDetails || {};
      const snippet = item.snippet || {};

      const dur = details.duration || "";
      const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const h = match?.[1] ? `${match[1]}:` : "";
      const m = match?.[2] || "0";
      const s = match?.[3]?.padStart(2, "0") || "00";
      const duration = h ? `${h}${m.padStart(2, "0")}:${s}` : `${m}:${s}`;

      return {
        title: snippet.title || "",
        duration,
        thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
        views: Number(stats.viewCount || 0),
        likes: Number(stats.likeCount || 0),
      };
    } catch (err) {
      console.error("fetchYouTubeMetadata error:", err);
      return null;
    }
  }

  // Fetch YouTube metadata
  const ytMetadata = await fetchYouTubeMetadata(youtubeUrl);
  if (ytMetadata) {
    if (!title || title === "Untitled Video") {
      resolvedTitle = ytMetadata.title;
    }
  }

  const videoId = uuid();
  const video: Video = {
    facultyId: targetFacultyId,
    facultyName: targetFacultyName,
    videoId,
    youtubeUrl,
    subject: resolvedSubject ?? resolvedSubjectId,
    subjectId: resolvedSubjectId,
    title: resolvedTitle,
    thumbnailUrl: ytMetadata?.thumbnailUrl || youtubeThumb(youtubeUrl) || undefined,
    duration: ytMetadata?.duration || undefined,
    views: ytMetadata?.views || 0,
    likes: ytMetadata?.likes || 0,
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
