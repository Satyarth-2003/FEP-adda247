import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! },
});
const ddb = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

interface MarchFaculty {
  name: string;
  email: string;
  adjustToken: string;
  trackingLink: string;
}

const MARCH_FEP: MarchFaculty[] = [
  { name: "Manvendra", email: "manvendra.singh@adda247.com", adjustToken: "21f5g8r6", trackingLink: "https://adda247.go.link?adj_t=21f5g8r6" },
  { name: "Nitish", email: "nitesh.narwani@adda247.com", adjustToken: "219b6g4o", trackingLink: "https://adda247.go.link?adj_t=219b6g4o" },
  { name: "Utkarsh", email: "utkarsh.mishra1@adda247.com", adjustToken: "21h1lkr3", trackingLink: "https://adda247.go.link?adj_t=21h1lkr3" },
  { name: "Ankita", email: "ankitas.selakoti@adda247.com", adjustToken: "21mflg6c", trackingLink: "https://adda247.go.link?adj_t=21mflg6c" },
  { name: "Renu", email: "renu.3@adda247.com", adjustToken: "217lvt3o", trackingLink: "https://adda247.go.link?adj_t=217lvt3o" },
  { name: "Abhishek", email: "abhishek.yadav1@adda247.com", adjustToken: "21qzb8i4", trackingLink: "https://adda247.go.link?adj_t=21qzb8i4" },
  { name: "Saumya", email: "saumya.singh1@adda247.com", adjustToken: "21wcgnj1", trackingLink: "https://adda247.go.link?adj_t=21wcgnj1" },
  { name: "Sabhya", email: "sabhya.yadav@adda247.com", adjustToken: "21tex11g", trackingLink: "https://adda247.go.link?adj_t=21tex11g" },
  { name: "Preeti", email: "preeti.2@adda247.com", adjustToken: "21pvqo2g", trackingLink: "https://adda247.go.link?adj_t=21pvqo2g" },
  { name: "Shalvi", email: "shalvi.singh@adda247.com", adjustToken: "21lpzu9u", trackingLink: "https://adda247.go.link?adj_t=21lpzu9u" },
  { name: "Rohit", email: "rohit.oli@adda247.com", adjustToken: "211b1x2i", trackingLink: "https://adda247.go.link?adj_t=211b1x2i" },
  { name: "Tushar", email: "tushar.mehra@adda247.com", adjustToken: "214wbw7g", trackingLink: "https://adda247.go.link?adj_t=214wbw7g" },
  { name: "Adiba", email: "adiba.shikhe@adda247.com", adjustToken: "21xm1ngc", trackingLink: "https://adda247.go.link?adj_t=21xm1ngc" },
  { name: "Ravi", email: "ravi.singh@adda247.com", adjustToken: "21ibe7sq", trackingLink: "https://adda247.go.link?adj_t=21ibe7sq" },
  { name: "Fateh", email: "fateh.singh1@adda247.com", adjustToken: "21j8jufo", trackingLink: "https://adda247.go.link?adj_t=21j8jufo" },
  { name: "Vipin", email: "vipin.chandra@adda247.com", adjustToken: "21ehx8pf", trackingLink: "https://adda247.go.link?adj_t=21ehx8pf" },
];

async function emailExists(email: string): Promise<string | null> {
  const res = await ddb.send(new QueryCommand({
    TableName: "fep-users", IndexName: "email-index",
    KeyConditionExpression: "email = :e", ExpressionAttributeValues: { ":e": email.toLowerCase().trim() }, Limit: 1,
  }));
  return res.Items?.[0]?.userId as string ?? null;
}

async function main() {
  console.log(`🚀 Seeding March FEP cohort (${MARCH_FEP.length} faculty)...\n`);
  const password = await bcrypt.hash("fep123", 10);
  let created = 0, updated = 0;

  for (const f of MARCH_FEP) {
    const email = f.email.toLowerCase().trim();
    const existingId = await emailExists(email);

    if (existingId) {
      await ddb.send(new UpdateCommand({
        TableName: "fep-users", Key: { userId: existingId },
        UpdateExpression: "SET cohort = :c, adjustToken = :at, trackingLink = :tl",
        ExpressionAttributeValues: { ":c": "March FEP", ":at": f.adjustToken, ":tl": f.trackingLink },
      }));
      updated++;
      console.log(`  Updated: ${f.name} (${email})`);
    } else {
      await ddb.send(new PutCommand({
        TableName: "fep-users",
        Item: {
          userId: uuid(), name: f.name, email, role: "fep_faculty",
          subjects: [], cohort: "March FEP",
          adjustToken: f.adjustToken, trackingLink: f.trackingLink,
          passwordHash: password, createdAt: new Date().toISOString(),
        },
      }));
      created++;
      console.log(`  Created: ${f.name} (${email})`);
    }
  }

  console.log(`\n✓ Created: ${created}, Updated: ${updated}`);
  console.log("Login: any email + password 'fep123'");
}

main().catch(e => { console.error("Seed failed:", e); process.exit(1); });
