import { config } from "dotenv";
config({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";

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

const GRADI_URL = process.env.GRADI_API_URL || "https://gradi.ai/api/analyze-video";

interface FacultyUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  subjects: string[];
  teachingSubject?: string;
}

// 15 curated videos with topic + subject keyword + preferred vertical
const VIDEOS: { title: string; url: string; subjectKey: string; vertical: string }[] = [
  { title: "Partition Of Punjab",                          url: "https://www.youtube.com/watch?v=3WTRlYnneqs", subjectKey: "history",     vertical: "ssc" },
  { title: "Photosynthesis — Class 10",                    url: "https://www.youtube.com/watch?v=f_x9SObhIgo", subjectKey: "biology",     vertical: "neet" },
  { title: "Why the Earth is CONSTANTLY Changing",         url: "https://www.youtube.com/watch?v=KcCgmg9gpkc", subjectKey: "geography",   vertical: "ssc" },
  { title: "Lines and Angles",                             url: "https://www.youtube.com/watch?v=FDXRil-geUg", subjectKey: "math",        vertical: "foundation" },
  { title: "Struggling with BPT — Class 10 Maths",         url: "https://www.youtube.com/watch?v=oNsxxcnSjNc", subjectKey: "math",        vertical: "foundation" },
  { title: "Structure of Human Heart",                     url: "https://www.youtube.com/watch?v=BsEZUKwGX0o", subjectKey: "biology",     vertical: "neet" },
  { title: "Class 10 Polynomials",                         url: "https://www.youtube.com/watch?v=fUQexNXsZFA", subjectKey: "math",        vertical: "foundation" },
  { title: "Nutrition in Animals",                         url: "https://www.youtube.com/watch?v=TUlxMGUMAow", subjectKey: "biology",     vertical: "foundation" },
  { title: "English Vocabulary — Quick Trick",             url: "https://www.youtube.com/shorts/TGLLNTuFtJo", subjectKey: "english",     vertical: "ssc" },
  { title: "Maths Trick — Quick Solve",                    url: "https://www.youtube.com/shorts/PMPWAHxRYo0", subjectKey: "math",        vertical: "ssc" },
  { title: "Geometry Trick",                               url: "https://www.youtube.com/shorts/Y2rbsdPIqgE", subjectKey: "math",        vertical: "foundation" },
  { title: "GS Informative Short",                         url: "https://www.youtube.com/shorts/tta1ab-JjgA", subjectKey: "geography",   vertical: "upsc" },
  { title: "General Studies Short",                        url: "https://www.youtube.com/shorts/leODpF4hfSI", subjectKey: "polity",      vertical: "upsc" },
  { title: "Motivational Short",                           url: "https://www.youtube.com/shorts/nhCM9SOfmzc", subjectKey: "english",     vertical: "ssc" },
  { title: "Funny Educational Short",                      url: "https://www.youtube.com/shorts/9D1DwGjygLw", subjectKey: "english",     vertical: "foundation" },
];

// Map a topic keyword onto a faculty's teachingSubject
function matchesFaculty(f: FacultyUser, key: string, vertical: string): number {
  const sub = (f.teachingSubject ?? "").toLowerCase();
  const inVertical = f.subjects?.includes(vertical) ? 2 : 0;
  if (!sub) return inVertical;
  const k = key.toLowerCase();
  let score = 0;
  if (sub.includes(k)) score += 5;
  // Loose synonyms
  if (k === "math" && (sub.includes("maths") || sub.includes("mathematic") || sub.includes("quantitative"))) score += 5;
  if (k === "biology" && (sub.includes("zoology") || sub.includes("botany") || sub.includes("biology"))) score += 5;
  if (k === "history" && sub.includes("history")) score += 5;
  if (k === "geography" && sub.includes("geograph")) score += 5;
  if (k === "english" && (sub.includes("english") || sub.includes("vyakaran") || sub.includes("urdu"))) score += 5;
  if (k === "polity" && (sub.includes("polit") || sub.includes("polity") || sub.includes("civics"))) score += 5;
  return score + inVertical;
}

function extractYtId(url: string): string | null {
  const m = url.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

async function callGradi(url: string) {
  const res = await fetch(GRADI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtube_url: url, analysis_language: "hinglish", category: null }),
  });
  if (!res.ok) throw new Error(`Gradi ${res.status}: ${res.statusText}`);
  const json = await res.json();
  const a = json?.data?.analysis;
  if (!a) throw new Error("Gradi: missing analysis");
  const r = a.ratings ?? {};
  const get = (k: string) => Number(r[k]?.score ?? 0);
  return {
    gradiScore: Number(a.gradi_score?.score ?? 0),
    scoreReason: a.gradi_score?.reason ?? "",
    oneLiner: a.one_liner ?? "",
    summary: a.summary ?? "",
    positives: a.positives ?? [],
    improvements: a.areas_of_improvement ?? [],
    ratingClarity: get("Clarity of Content"),
    ratingDepth: get("Content Depth"),
    ratingStructure: get("Content Structure"),
    ratingCommunication: get("Communication Effectiveness"),
    ratingInteraction: get("Student Interaction"),
    ratingCommercial: get("Commercial Balance"),
    videoMetadata: json.data?.video_metadata,
    analyzedAt: json.data?.timestamp ?? new Date().toISOString(),
  };
}

async function main() {
  console.log("→ Loading faculty roster…");
  const usersRes = await ddb.send(
    new ScanCommand({
      TableName: "fep-users",
      FilterExpression: "#r = :r",
      ExpressionAttributeNames: { "#r": "role" },
      ExpressionAttributeValues: { ":r": "eduskill_faculty" },
    })
  );
  const allFaculty = (usersRes.Items ?? []) as FacultyUser[];
  console.log(`✓ Loaded ${allFaculty.length} faculty\n`);

  // Load subjects to get name-by-id
  const subjectsRes = await ddb.send(new ScanCommand({ TableName: "fep-subjects" }));
  const subjectsByName = new Map<string, string>();
  for (const s of subjectsRes.Items ?? []) subjectsByName.set(String(s.subjectId), String(s.name));

  const usedFacultyIds = new Set<string>();
  console.log(`→ Inserting ${VIDEOS.length} videos and triggering Gradi analysis in parallel…\n`);

  const tasks = VIDEOS.map(async (v, idx) => {
    // Pick best-matching faculty (avoid reusing if possible)
    const ranked = allFaculty
      .map(f => ({ f, score: matchesFaculty(f, v.subjectKey, v.vertical), used: usedFacultyIds.has(f.userId) }))
      .sort((a, b) => (a.used === b.used ? b.score - a.score : a.used ? 1 : -1));
    const pick = ranked[0]?.f;
    if (!pick) {
      console.log(`[${idx + 1}/15] ✗ No faculty match for "${v.title}"`);
      return;
    }
    usedFacultyIds.add(pick.userId);

    const videoId = uuid();
    const ytId = extractYtId(v.url);
    const subjectName = subjectsByName.get(v.vertical) ?? v.vertical;

    const videoItem = {
      facultyId: pick.userId,
      facultyName: pick.name,
      videoId,
      youtubeUrl: v.url,
      subject: subjectName,
      subjectId: v.vertical,
      title: v.title,
      thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined,
      uploadedAt: new Date().toISOString(),
      status: "analyzing" as const,
    };

    await ddb.send(new PutCommand({ TableName: "fep-videos", Item: videoItem }));
    console.log(`[${idx + 1}/15] → ${pick.name.padEnd(28)} | ${v.title.slice(0, 38).padEnd(38)} | analyzing…`);

    try {
      const analysis = await callGradi(v.url);
      await ddb.send(
        new PutCommand({
          TableName: "fep-gradi-analyses",
          Item: { videoId, ...analysis },
        })
      );
      await ddb.send(
        new UpdateCommand({
          TableName: "fep-videos",
          Key: { facultyId: pick.userId, videoId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "gradi_done" },
        })
      );
      console.log(`[${idx + 1}/15] ✓ ${v.title.slice(0, 38).padEnd(38)} → Gradi: ${analysis.gradiScore}/5`);
    } catch (e) {
      console.log(`[${idx + 1}/15] ✗ Gradi failed for "${v.title}":`, e instanceof Error ? e.message : e);
    }
  });

  await Promise.all(tasks);
  console.log("\nDone. Open the Manager dashboard → Analytics tab to see the new data.");
}

main().catch(e => {
  console.error("Seed-videos failed:", e);
  process.exit(1);
});
