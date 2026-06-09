import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/types";

// GET — Manager: list all faculty (with subject filter)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "fep_manager" && user.role !== "fep_admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");

  const r = await ddb.send(
    new ScanCommand({
      TableName: TABLES.USERS,
      FilterExpression: "#r = :r",
      ExpressionAttributeNames: { "#r": "role" },
      ExpressionAttributeValues: { ":r": "fep_faculty" },
    })
  );
  let items = (r.Items ?? []) as User[];
  if (subjectId) {
    items = items.filter((u) => (u.subjects ?? []).includes(subjectId));
  }
  // Strip password hashes
  items = items.map((u) => {
    const { passwordHash: _ph, ...rest } = u;
    void _ph;
    return rest as User;
  });

  return NextResponse.json({ users: items });
}
