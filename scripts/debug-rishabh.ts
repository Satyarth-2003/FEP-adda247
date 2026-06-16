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
    // Find Rishabh Raja
    const usersRes = await ddb.send(new ScanCommand({ TableName: "fep-users" }));
    const users = usersRes.Items || [];
    const rishabh = users.find(u => u.name.includes("Rishabh Raja"));
    if (!rishabh) {
      console.log("Rishabh Raja not found in users.");
      return;
    }
    console.log("Rishabh Raja user record:", rishabh);

    // Find his videos
    const videosRes = await ddb.send(new QueryCommand({
      TableName: "fep-videos",
      KeyConditionExpression: "facultyId = :f",
      ExpressionAttributeValues: { ":f": rishabh.userId }
    }));
    const videos = videosRes.Items || [];
    console.log("Rishabh Raja's videos:", videos);

  } catch (err) {
    console.error(err);
  }
}
run();
