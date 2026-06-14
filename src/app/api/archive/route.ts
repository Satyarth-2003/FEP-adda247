import { NextResponse } from "next/server";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";

const ARCHIVE_PK = "fep-program-archive";

// GET — returns saved archive (falls back to static JSON if none saved)
export async function GET() {
  try {
    const res = await ddb.send(
      new GetCommand({ TableName: TABLES.SUBJECTS, Key: { subjectId: ARCHIVE_PK } })
    );
    if (res.Item?.data) {
      return NextResponse.json({ archive: res.Item.data, source: "db" });
    }
  } catch {
    // fall through to static
  }
  // Fallback: serve the static seeded JSON
  const staticData = await import("@/data/programArchive.json");
  return NextResponse.json({ archive: staticData.default, source: "static" });
}

// PUT — manager saves edits to archive (persisted in DynamoDB)
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "eduskill_manager") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { archive } = await req.json();
  if (!archive) return NextResponse.json({ error: "archive payload required" }, { status: 400 });

  await ddb.send(
    new PutCommand({
      TableName: TABLES.SUBJECTS,
      Item: { subjectId: ARCHIVE_PK, data: archive, updatedAt: new Date().toISOString(), updatedBy: user.name },
    })
  );

  return NextResponse.json({ ok: true });
}
