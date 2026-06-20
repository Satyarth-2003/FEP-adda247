import { config } from "dotenv";
config({ path: ".env.local" });

const GRADI_URL = process.env.GRADI_API_URL || "https://gradi.ai/api/analyze-video";

async function run() {
  const url = "https://www.youtube.com/watch?v=khTprxRj9xM"; // Sample valid lecture
  console.log("Calling Gradi API directly at:", GRADI_URL);
  
  try {
    const res = await fetch(GRADI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtube_url: url,
        analysis_language: "hinglish",
        category: null,
      }),
    });

    console.log("Status:", res.status, res.statusText);
    const json = await res.json();
    console.log("Raw Response JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Direct fetch failed:", err);
  }
}

run();
