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

  const { name, email, phone, role, subjects, teachingSubject, examTarget, cohort } = await req.json();
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
    cohort: cohort || (role === "eduskill_faculty" ? "June EduSkill" : undefined),
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

// PUT — update a user's details (admin only)
export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json();
  const { userId, name, email, phone, role, subjects, teachingSubject, examTarget, cohort } = body;
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

  const validRoles: Role[] = ["eduskill_faculty", "eduskill_manager", "eduskill_admin"];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Construct update expression and attribute structures
  const updateFields: Record<string, unknown> = {};
  if (name !== undefined) updateFields.name = name;
  if (email !== undefined) updateFields.email = email.toLowerCase().trim();
  if (phone !== undefined) updateFields.phone = phone || undefined;
  if (role !== undefined) updateFields.role = role;
  if (subjects !== undefined) updateFields.subjects = subjects;
  if (teachingSubject !== undefined) updateFields.teachingSubject = teachingSubject || undefined;
  if (examTarget !== undefined) updateFields.examTarget = examTarget || undefined;
  if (cohort !== undefined) updateFields.cohort = cohort || undefined;

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
  const updateParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updateFields)) {
    updateParts.push(`#${key} = :${key}`);
    expressionAttributeNames[`#${key}`] = key;
    expressionAttributeValues[`:${key}`] = value;
  }

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { userId },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    console.error("Error updating user in DynamoDB:", error);
    return NextResponse.json(
      { error: "Failed to update user", details: error.message },
      { status: 500 }
    );
  }
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

