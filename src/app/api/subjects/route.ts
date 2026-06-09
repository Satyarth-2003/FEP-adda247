import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";

export async function GET() {
  const r = await ddb.send(new ScanCommand({ TableName: TABLES.SUBJECTS }));
  return NextResponse.json({ subjects: r.Items ?? [] });
}
