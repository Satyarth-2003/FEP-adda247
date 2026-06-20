import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

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

async function run() {
  const scan = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const dbUsers = scan.Items ?? [];
  const juneUsers = dbUsers.filter(u => u.cohort === "June EduSkill");

  console.log(`Verification:`);
  console.log(`  Total Users in DB: ${dbUsers.length}`);
  console.log(`  June Cohort Users in DB: ${juneUsers.length}`);
  
  // Find any remaining duplicates
  const emailMap = new Map<string, string[]>();
  for (const u of juneUsers) {
    const e = String(u.email).toLowerCase().trim();
    if (!emailMap.has(e)) {
      emailMap.set(e, []);
    }
    emailMap.get(e)!.push(u.userId);
  }

  let dupCount = 0;
  for (const [email, ids] of emailMap.entries()) {
    if (ids.length > 1) {
      dupCount++;
      console.log(`  - Duplicate June Cohort email in DB: ${email} has IDs: ${ids.join(", ")}`);
    }
  }

  console.log(`  Duplicates in June Cohort: ${dupCount}`);
}

run().catch(console.error);
