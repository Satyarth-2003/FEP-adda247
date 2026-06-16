async function run() {
  try {
    const res = await fetch("https://gradi.ai/api/analyze-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtube_url: "https://youtu.be/cN-DCbU7i3E",
        analysis_language: "hinglish",
        category: null,
      }),
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("JSON response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
