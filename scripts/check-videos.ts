import { ddb, TABLES } from "../src/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

async function run() {
  try {
    const res = await ddb.send(new QueryCommand({
      TableName: TABLES.VIDEOS,
      KeyConditionExpression: "facultyId = :f",
      ExpressionAttributeValues: { ":f": "b7505784-33f8-40a9-9440-cdca552c8d99" }
    }));
    console.log("VIDEOS FOR SATYARTH PRAKASH SRIVASTAVA:", JSON.stringify(res.Items, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
