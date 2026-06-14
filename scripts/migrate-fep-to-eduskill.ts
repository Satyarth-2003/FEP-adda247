import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

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

async function migrate() {
  console.log("Starting DB migration: EduSkill to EduSkill...");
  
  const scan = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const users = scan.Items ?? [];
  
  console.log(`Scanning db: Found ${users.length} users.`);
  
  let migratedCount = 0;
  
  for (const u of users) {
    let needsUpdate = false;
    let newRole = u.role;
    let newCohort = u.cohort;
    
    if (u.role === "eduskill_faculty") {
      newRole = "eduskill_faculty";
      needsUpdate = true;
    } else if (u.role === "eduskill_manager") {
      newRole = "eduskill_manager";
      needsUpdate = true;
    } else if (u.role === "eduskill_admin") {
      newRole = "eduskill_admin";
      needsUpdate = true;
    }
    
    if (u.cohort === "June EduSkill") {
      newCohort = "June EduSkill";
      needsUpdate = true;
    } else if (u.cohort === "March EduSkill") {
      newCohort = "March EduSkill";
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log(`Migrating user ${u.email}: role (${u.role} -> ${newRole}), cohort (${u.cohort} -> ${newCohort})`);
      const updateExpr = newCohort ? "SET #role = :r, cohort = :c" : "SET #role = :r";
      const attrVals: any = { ":r": newRole };
      if (newCohort) {
        attrVals[":c"] = newCohort;
      }
      
      await ddb.send(
        new UpdateCommand({
          TableName: "fep-users",
          Key: { userId: u.userId },
          UpdateExpression: updateExpr,
          ExpressionAttributeNames: { "#role": "role" },
          ExpressionAttributeValues: attrVals,
        })
      );
      migratedCount++;
    }
  }
  
  console.log(`✓ Successfully migrated ${migratedCount} users in DynamoDB!`);
}

migrate().catch(console.error);
