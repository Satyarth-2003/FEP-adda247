import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
);

const TARGET_EMAILS = [
  "manvendra.singh@adda247.com",
  "nitesh.narwani@adda247.com",
  "utkarsh.mishra1@adda247.com",
  "ankitas.selakoti@adda247.com",
  "renu.3@adda247.com",
  "abhishek.yadav1@adda247.com",
  "preeti.2@adda247",
  "preeti.2@adda247.com",
  "rohit.oli@adda247.com",
  "ravi.singh@adda247.com",
  "fateh.singh1@adda247.com",
  "shahan.malik@adda247.com"
].map(e => e.toLowerCase().trim());

async function run() {
  const usersRes = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
  const users = usersRes.Items || [];

  console.log(`Total users in DB: ${users.length}`);

  let updatedCount = 0;
  for (const u of users) {
    const email = String(u.email || "").toLowerCase().trim();
    
    // Check match by email (either exact match or if target is preeti.2@adda247 and DB has preeti.2@adda247.com or vice-versa)
    const isMatch = TARGET_EMAILS.some(target => 
      email === target || 
      (target.startsWith("preeti.2@adda247") && email.startsWith("preeti.2@adda247"))
    );

    if (isMatch) {
      console.log(`Matching user found: ${u.name} (${u.email}) - Current Role: ${u.role}, Current Cohort: ${u.cohort}`);
      
      const updatedUser = {
        ...u,
        role: "eduskill_manager",
        cohort: "March EduSkill", // Keep them marked in March EduSkill
        updatedAt: new Date().toISOString()
      };

      await ddb.send(new PutCommand({
        TableName: "fep-users",
        Item: updatedUser
      }));

      console.log(`Successfully updated ${u.name} to eduskill_manager and March EduSkill cohort.`);
      updatedCount++;
    }
  }

  console.log(`\nMigration complete. Total updated: ${updatedCount}`);
}

run().catch(console.error);
