import { NextResponse } from "next/server";
import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import type { GradiAnalysis, ManagerRating, Video } from "@/types";

// GET — full video detail (video + analysis + manager ratings)
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ videoId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { videoId } = await ctx.params;

  // Find the video — scan via Query if faculty, else scan all (small dataset)
  let video: Video | undefined;
  if (user.role === "fep_faculty") {
    const r = await ddb.send(
      new QueryCommand({
        TableName: TABLES.VIDEOS,
        KeyConditionExpression: "facultyId = :f AND videoId = :v",
        ExpressionAttributeValues: { ":f": user.userId, ":v": videoId },
      })
    );
    video = r.Items?.[0] as Video | undefined;
  } else {
    const r = await ddb.send(
      new ScanCommand({
        TableName: TABLES.VIDEOS,
        FilterExpression: "videoId = :v",
        ExpressionAttributeValues: { ":v": videoId },
      })
    );
    video = r.Items?.[0] as Video | undefined;
  }

  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [analysisRes, ratingsRes] = await Promise.all([
    ddb.send(new GetCommand({ TableName: TABLES.ANALYSES, Key: { videoId } })),
    ddb.send(
      new QueryCommand({
        TableName: TABLES.RATINGS,
        KeyConditionExpression: "videoId = :v",
        ExpressionAttributeValues: { ":v": videoId },
      })
    ),
  ]);

  return NextResponse.json({
    video,
    analysis: (analysisRes.Item ?? null) as GradiAnalysis | null,
    managerRatings: (ratingsRes.Items ?? []) as ManagerRating[],
  });
}
