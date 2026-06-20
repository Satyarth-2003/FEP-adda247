import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

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

const PROMOTE_TO_ADMIN = [
  "roshan.singh@adda247.com",
  "vikas.mann@adda247.com",
];

async function main() {
  for (const email of PROMOTE_TO_ADMIN) {
    const res = await ddb.send(new QueryCommand({
      TableName: "fep-users",
      IndexName: "email-index",
      KeyConditionExpression: "email = :e",
      ExpressionAttributeValues: { ":e": email.toLowerCase().trim() },
    }));

    const items = res.Items ?? [];
    if (items.length === 0) {
      console.log(`  ✗ No user found for ${email}`);
      continue;
    }

    for (const user of items) {
      const prevRole = user.role;
      await ddb.send(new PutCommand({
        TableName: "fep-users",
        Item: { ...user, role: "eduskill_admin" },
      }));
      console.log(`  ✓ ${email} promoted from ${prevRole} → eduskill_admin`);
    }
  }
  console.log("\nDone.");
}

main().catch(e => { console.error(e); process.exit(1); });
