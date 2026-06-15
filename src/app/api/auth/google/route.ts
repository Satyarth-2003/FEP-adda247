import { NextResponse } from "next/server";
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "@/lib/dynamodb";
import { signToken, setAuthCookie } from "@/lib/auth";
import type { User } from "@/types";

/**
 * POST /api/auth/google
 * Receives a Google ID token (credential), verifies it via Google's tokeninfo,
 * looks up the email in DynamoDB, and issues a session JWT if whitelisted.
 *
 * Verification uses Google's v3 tokeninfo endpoint which returns JSON with
 * the payload fields including `email`, `email_verified`, `aud`, and `sub`.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credential } = body as { credential?: string };

    if (!credential) {
      return NextResponse.json(
        { error: "Google credential required" },
        { status: 400 }
      );
    }

    // ── Verify ID token via Google's public tokeninfo endpoint ─────────────
    // Using v3 endpoint which is more reliable and returns proper JSON fields.
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
      { headers: { Accept: "application/json" } }
    );

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => "");
      console.error("Google tokeninfo failed:", tokenRes.status, errBody);
      return NextResponse.json(
        { error: "Could not verify Google sign-in. Please try again." },
        { status: 401 }
      );
    }

    const payload = await tokenRes.json();
    const { email, email_verified, name, picture, aud } = payload as {
      email?: string;
      email_verified?: string | boolean;
      name?: string;
      picture?: string;
      aud?: string;
      sub?: string;
    };

    // email_verified may be boolean or the string "true" depending on endpoint
    const isVerified =
      email_verified === true || email_verified === "true";

    if (!email || !isVerified) {
      return NextResponse.json(
        { error: "Google account email is not verified. Please verify your Google account and try again." },
        { status: 401 }
      );
    }

    // ── Audience check ─────────────────────────────────────────────────────
    // `aud` can be a comma-separated list when multiple client IDs are present
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId) {
      const audiences = String(aud ?? "")
        .split(",")
        .map((s) => s.trim());
      if (!audiences.includes(clientId)) {
        console.error("Token audience mismatch:", aud, "expected:", clientId);
        return NextResponse.json(
          { error: "Invalid token audience. Make sure you are signing in to the correct app." },
          { status: 401 }
        );
      }
    }

    // ── Look up user by email (case-insensitive) ───────────────────────────
    const normalizedEmail = String(email).toLowerCase().trim();

    // Primary: use email-index GSI (fast)
    let user: User | undefined;
    try {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLES.USERS,
          IndexName: "email-index",
          KeyConditionExpression: "email = :e",
          ExpressionAttributeValues: { ":e": normalizedEmail },
          Limit: 1,
        })
      );
      user = result.Items?.[0] as User | undefined;
    } catch (gsiErr) {
      console.warn("email-index GSI query failed, falling back to scan:", gsiErr);
    }

    // Fallback: full scan (handles case where GSI doesn't exist or email is stored differently)
    if (!user) {
      const scanResult = await ddb.send(
        new ScanCommand({
          TableName: TABLES.USERS,
          FilterExpression: "email = :e",
          ExpressionAttributeValues: { ":e": normalizedEmail },
          Limit: 50,
        })
      );
      user = scanResult.Items?.[0] as User | undefined;

      // Last resort: case-insensitive scan match (handles emails stored in mixed case)
      if (!user && scanResult.Items && scanResult.Items.length === 0) {
        const fullScan = await ddb.send(
          new ScanCommand({ TableName: TABLES.USERS })
        );
        user = fullScan.Items?.find(
          (u) =>
            typeof u.email === "string" &&
            u.email.toLowerCase().trim() === normalizedEmail
        ) as User | undefined;
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          error: `Access denied. The email "${email}" is not registered in the EduSkill system. Contact your program manager to get access.`,
        },
        { status: 403 }
      );
    }

    // ── Issue JWT ──────────────────────────────────────────────────────────
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
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
