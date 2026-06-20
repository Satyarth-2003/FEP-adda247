import { NextResponse } from "next/server";
import { getCurrentUser, signToken, setAuthCookie } from "@/lib/auth";
import { ddb, TABLES } from "@/lib/dynamodb";
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { User } from "@/types";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ user: null }, { status: 200 });

  // Re-validate the userId from DB to handle account reconciliation
  // (e.g., if a duplicate account was merged, the old userId in JWT no longer exists)
  try {
    const userRes = await ddb.send(
      new GetCommand({ TableName: TABLES.USERS, Key: { userId: u.userId } })
    );

    if (!userRes.Item) {
      // userId from JWT no longer exists — look up by email and re-issue token
      const emailRes = await ddb.send(
        new QueryCommand({
          TableName: TABLES.USERS,
          IndexName: "email-index",
          KeyConditionExpression: "email = :e",
          ExpressionAttributeValues: { ":e": u.email.toLowerCase().trim() },
          Limit: 1,
        })
      );

      const freshUser = emailRes.Items?.[0] as User | undefined;
      if (!freshUser) {
        // Account truly doesn't exist anymore — clear session
        return NextResponse.json({ user: null }, { status: 200 });
      }

      // Re-issue JWT with the correct userId
      const newPayload = {
        userId: freshUser.userId,
        email: freshUser.email,
        name: freshUser.name,
        role: freshUser.role,
      };
      const newToken = await signToken(newPayload);
      await setAuthCookie(newToken);

      console.log(`[/api/auth/me] Re-issued token for ${freshUser.email}: old userId=${u.userId} → new userId=${freshUser.userId}`);
      return NextResponse.json({ user: newPayload });
    }

    // userId is valid — return fresh data from DB (in case name/role changed)
    const dbUser = userRes.Item as User;
    return NextResponse.json({
      user: {
        userId: dbUser.userId,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      },
    });
  } catch (err) {
    console.error("[/api/auth/me] DB re-validation error:", err);
    // Fall back to JWT data if DB lookup fails
    return NextResponse.json({ user: u });
  }
}
