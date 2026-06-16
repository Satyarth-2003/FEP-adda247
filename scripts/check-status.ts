import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

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
    const videosRes = await ddb.send(new ScanCommand({ TableName: "fep-videos" }));
    const videos = videosRes.Items || [];

    const stats: Record<string, number> = {};
    for (const v of videos) {
      stats[v.status || "no_status"] = (stats[v.status || "no_status"] || 0) + 1;
    }

    console.log("Video status stats:", stats);

    const analysesRes = await ddb.send(new ScanCommand({ TableName: "fep-gradi-analyses", ProjectionExpression: "videoId" }));
    console.log("Total graded videos in fep-gradi-analyses:", analysesRes.Items?.length || 0);

  } catch (err) {
    console.error(err);
  }
}
run();
