const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ddb = DynamoDBDocumentClient.from(client);

async function run() {
  try {
    const [usersRes, videosRes, analysesRes, ratingsRes] = await Promise.all([
      ddb.send(new ScanCommand({ TableName: "fep-users" })),
      ddb.send(new ScanCommand({ TableName: "fep-videos" })),
      ddb.send(new ScanCommand({ TableName: "fep-gradi-analyses" })),
      ddb.send(new ScanCommand({ TableName: "fep-manager-ratings" })),
    ]);

    const users = usersRes.Items;
    const videos = videosRes.Items;
    const analyses = analysesRes.Items;
    const ratings = ratingsRes.Items;
    const aMap = new Map(analyses.map((a) => [a.videoId, a]));

    const pramila = users.find(u => u.email === "pramilayaduvanshi0@gmail.com");
    
    // Sort ratings by ratedAt descending globally to see all
    console.log("All ratings in DB for Pramila's video:");
    const prRatings = ratings.filter(r => r.videoId === "a67b1ca4-6f3d-465b-a971-bfb133ca7597");
    console.log(prRatings);

  } catch (err) {
    console.error(err);
  }
}

run();
