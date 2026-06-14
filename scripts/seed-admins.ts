import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
  { marshallOptions: { removeUndefinedValues: true } }
);

const ADMINS = [
  { name: "Satyarth Prakash", email: "satyarth.prakash@adda247.com" },
  { name: "Ayush Chauhan", email: "ayush.chauhan@adda247.com" },
];

const MANAGERS = [
  { name: "Ayush Chauhan", email: "ayush.chauhan@adda247.com" },
  { name: "Anil Bhadauria", email: "anil.bhadauria@addaeducation.com" },
  { name: "Roshan Singh", email: "roshan.singh@adda247.com" },
  { name: "Vikas Mann", email: "vikas.mann@adda247.com" },
];

async function emailExists(email: string): Promise<boolean> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: "fep-users",
      IndexName: "email-index",
      KeyConditionExpression: "email = :e",
      ExpressionAttributeValues: { ":e": email.toLowerCase().trim() },
      Limit: 1,
    })
  );
  return (res.Items?.length ?? 0) > 0;
}

async function main() {
  const password = await bcrypt.hash("fep123", 10);

  // Seed admins
  console.log("→ Seeding admin accounts…");
  for (const a of ADMINS) {
    const email = a.email.toLowerCase().trim();
    if (await emailExists(email)) {
      console.log(`  ✓ ${email} already exists (updating role to admin)`);
      // Update role — can't update PK, so just re-put
      const { QueryCommand: QC } = await import("@aws-sdk/lib-dynamodb");
      const r = await ddb.send(new QC({
        TableName: "fep-users",
        IndexName: "email-index",
        KeyConditionExpression: "email = :e",
        ExpressionAttributeValues: { ":e": email },
      }));
      const existing = r.Items?.[0];
      if (existing) {
        await ddb.send(new PutCommand({
          TableName: "fep-users",
          Item: { ...existing, role: "eduskill_admin" },
        }));
      }
      continue;
    }
    await ddb.send(new PutCommand({
      TableName: "fep-users",
      Item: {
        userId: uuid(),
        name: a.name,
        email,
        role: "eduskill_admin",
        subjects: [],
        passwordHash: password,
        createdAt: new Date().toISOString(),
      },
    }));
    console.log(`  ✓ Created admin: ${email}`);
  }

  // Seed managers
  console.log("\n→ Seeding manager accounts…");
  for (const m of MANAGERS) {
    const email = m.email.toLowerCase().trim();
    if (await emailExists(email)) {
      // Update to manager if they're not already admin
      const r = await ddb.send(new QueryCommand({
        TableName: "fep-users",
        IndexName: "email-index",
        KeyConditionExpression: "email = :e",
        ExpressionAttributeValues: { ":e": email },
      }));
      const existing = r.Items?.[0];
      if (existing && existing.role !== "eduskill_admin") {
        await ddb.send(new PutCommand({
          TableName: "fep-users",
          Item: { ...existing, role: "eduskill_manager" },
        }));
        console.log(`  ✓ ${email} upgraded to manager`);
      } else {
        console.log(`  ✓ ${email} already exists (${existing?.role})`);
      }
      continue;
    }
    await ddb.send(new PutCommand({
      TableName: "fep-users",
      Item: {
        userId: uuid(),
        name: m.name,
        email,
        role: "eduskill_manager",
        subjects: [],
        passwordHash: password,
        createdAt: new Date().toISOString(),
      },
    }));
    console.log(`  ✓ Created manager: ${email}`);
  }

  console.log("\nDone.");
  console.log("Admin login: satyarth.prakash@adda247.com or ayush.chauhan@adda247.com / fep123");
  console.log("Manager login: roshan.singh@adda247.com / fep123");
}

main().catch(e => { console.error(e); process.exit(1); });
