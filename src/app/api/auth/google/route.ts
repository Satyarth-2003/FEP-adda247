import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { signToken, setAuthCookie } from "@/lib/auth";
import type { User } from "@/types";

/**
 * POST /api/auth/google
 * Receives a Google ID token (credential), verifies it via Google's tokeninfo,
 * looks up the email in DynamoDB, and issues a session JWT if whitelisted.
 */
export async function POST(req: Request) {
  try {
    const { credential } = await req.json();
    if (!credential) {
      return NextResponse.json({ error: "Google credential required" }, { status: 400 });
    }

    // Verify the Google ID token via Google's tokeninfo endpoint
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    if (!googleRes.ok) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const googlePayload = await googleRes.json();
    const { email, email_verified, name, picture } = googlePayload;

    if (!email || email_verified !== "true") {
      return NextResponse.json({ error: "Email not verified by Google" }, { status: 401 });
    }

    // Verify the token was issued for our app
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId && googlePayload.aud !== clientId) {
      return NextResponse.json({ error: "Token audience mismatch" }, { status: 401 });
    }

    // Look up user by email in DynamoDB
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLES.USERS,
        IndexName: "email-index",
        KeyConditionExpression: "email = :e",
        ExpressionAttributeValues: { ":e": String(email).toLowerCase().trim() },
        Limit: 1,
      })
    );

    const user = result.Items?.[0] as User | undefined;
    if (!user) {
      return NextResponse.json(
        { error: "Access denied. Your email is not registered in the FEP system. Contact your program manager." },
        { status: 403 }
      );
    }

    // Issue JWT with the user's role
    const token = await signToken({
      userId: user.userId,
      email: user.email,
      name: user.name || name || email,
      role: user.role,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name || name,
        role: user.role,
        subjects: user.subjects,
        avatarUrl: picture || user.avatarUrl,
      },
    });
  } catch (e) {
    console.error("Google auth error:", e);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
