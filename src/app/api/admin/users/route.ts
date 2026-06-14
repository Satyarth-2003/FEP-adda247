import { NextResponse } from "next/server";
import { ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import type { User, Role } from "@/types";

// Only eduskill_admin can access this
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "eduskill_admin") return null;
  return user;
}

// GET — list all users
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const r = await ddb.send(new ScanCommand({ TableName: TABLES.USERS }));
  const users = ((r.Items ?? []) as User[]).map(u => {
    const { passwordHash: _, ...rest } = u;
    return rest;
  });
  users.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ users });
}

// POST — create a new user
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { name, email, phone, role, subjects, teachingSubject, examTarget } = await req.json();
  if (!name || !email || !role) {
    return NextResponse.json({ error: "name, email, role required" }, { status: 400 });
  }

  const validRoles: Role[] = ["eduskill_faculty", "eduskill_manager", "eduskill_admin"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const password = await bcrypt.hash("fep123", 10);
  const user = {
    userId: uuid(),
    name,
    email: email.toLowerCase().trim(),
    phone: phone ?? undefined,
    role,
    subjects: subjects ?? [],
    teachingSubject: teachingSubject ?? undefined,
    examTarget: examTarget ?? undefined,
    passwordHash: password,
    createdAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TABLES.USERS, Item: user }));
  const { passwordHash: _, ...safe } = user;
  return NextResponse.json({ user: safe });
}

// DELETE — remove a user
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Find the user to get their partition key
  const r = await ddb.send(
    new ScanCommand({
      TableName: TABLES.USERS,
      FilterExpression: "userId = :u",
      ExpressionAttributeValues: { ":u": userId },
    })
  );
  const user = r.Items?.[0];
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await ddb.send(
    new DeleteCommand({ TableName: TABLES.USERS, Key: { userId } })
  );
  return NextResponse.json({ ok: true });
}
