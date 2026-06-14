import { config } from "dotenv";
config({ path: ".env.local" });
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const subjects = [
  { subjectId: "math", name: "Mathematics", description: "Quant & reasoning" },
  { subjectId: "english", name: "English", description: "Grammar, vocab, comprehension" },
  { subjectId: "science", name: "Science", description: "Physics, Chem, Bio" },
  { subjectId: "sst", name: "Social Studies", description: "History, Geography, Civics" },
  { subjectId: "reasoning", name: "Reasoning", description: "Logical & analytical reasoning" },
  { subjectId: "gs", name: "General Studies", description: "GK & current affairs" },
];

const faculty = [
  { name: "Ankita Selakoti", email: "ankita@fep.local", subjects: ["science"] },
  { name: "Shuaib Ansari", email: "shuaib@fep.local", subjects: ["math"] },
  { name: "Vipin Chandra Bhatt", email: "vipin@fep.local", subjects: ["math"] },
  { name: "Fateh Singh", email: "fateh@fep.local", subjects: ["sst"] },
  { name: "Kanishka Bakshi", email: "kanishka@fep.local", subjects: ["english"] },
  { name: "Sudiksha", email: "sudiksha@fep.local", subjects: ["reasoning"] },
  { name: "Manvendra Pratap Singh", email: "manvendra@fep.local", subjects: ["gs"] },
  { name: "Deepali Pandey", email: "deepali@fep.local", subjects: ["english"] },
];

const managers = [
  { name: "Roshan Singh", email: "roshan@fep.local" },
  { name: "Ayush Chauhan", email: "ayush@fep.local" },
];

async function main() {
  // subjects
  for (const s of subjects) {
    await ddb.send(new PutCommand({ TableName: "fep-subjects", Item: s }));
  }
  console.log(`✓ Seeded ${subjects.length} subjects`);

  const password = await bcrypt.hash("fep123", 10);

  // faculty
  for (const f of faculty) {
    await ddb.send(
      new PutCommand({
        TableName: "fep-users",
        Item: {
          userId: uuid(),
          name: f.name,
          email: f.email,
          role: "eduskill_faculty",
          subjects: f.subjects,
          passwordHash: password,
          createdAt: new Date().toISOString(),
        },
      })
    );
  }
  console.log(`✓ Seeded ${faculty.length} faculty (password: fep123)`);

  // managers
  for (const m of managers) {
    await ddb.send(
      new PutCommand({
        TableName: "fep-users",
        Item: {
          userId: uuid(),
          name: m.name,
          email: m.email,
          role: "eduskill_manager",
          subjects: [],
          passwordHash: password,
          createdAt: new Date().toISOString(),
        },
      })
    );
  }
  console.log(`✓ Seeded ${managers.length} managers (password: fep123)`);

  console.log("\nLogin examples:");
  console.log("  Faculty: ankita@fep.local / fep123");
  console.log("  Manager: roshan@fep.local / fep123");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
