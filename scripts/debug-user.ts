import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ddb = DynamoDBDocumentClient.from(client);

async function run() {
  try {
    const usersRes = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
    const users = usersRes.Items || [];
    for (const u of users) {
      if (u.name.toLowerCase().includes("satyarth") || u.email.toLowerCase().includes("satyarth")) {
        console.log("User:", u.name, "Email:", u.email, "Role:", u.role, "ID:", u.userId);
        const videosRes = await ddb.send(new QueryCommand({
          TableName: "fep-videos",
          KeyConditionExpression: "facultyId = :f",
          ExpressionAttributeValues: { ":f": u.userId }
        }));
        console.log(`- Videos: ${videosRes.Items?.length || 0}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
