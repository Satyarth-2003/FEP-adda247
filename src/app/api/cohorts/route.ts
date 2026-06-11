import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/types";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "fep_manager" && user.role !== "fep_admin")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cohort = searchParams.get("cohort");

  const res = await ddb.send(new ScanCommand({
    TableName: TABLES.USERS,
    FilterExpression: "#r = :r",
    ExpressionAttributeNames: { "#r": "role" },
    ExpressionAttributeValues: { ":r": "fep_faculty" },
  }));

  const allFaculty = (res.Items ?? []) as User[];
  
  // Get unique cohorts
  const cohortSet = new Set<string>();
  for (const f of allFaculty) {
    if (f.cohort) cohortSet.add(f.cohort);
  }

  // Filter by cohort if specified
  const filtered = cohort 
    ? allFaculty.filter(f => f.cohort === cohort)
    : allFaculty;

  return NextResponse.json({
    cohorts: Array.from(cohortSet).sort(),
    faculty: filtered.map(f => ({
      userId: f.userId,
      name: f.name,
      email: f.email,
      cohort: f.cohort ?? "Unassigned",
      adjustToken: f.adjustToken ?? null,
      trackingLink: f.trackingLink ?? null,
    })),
    total: filtered.length,
  });
}
