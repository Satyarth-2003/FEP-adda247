import { signToken } from "../src/lib/auth";

async function run() {
  const token = await signToken({
    userId: "a949cb15-6ffe-4ddf-a3f2-44324c805da9", // Satyarth (admin)
    email: "satyarth.prakash@adda247.com",
    name: "Satyarth Prakash",
    role: "eduskill_admin"
  });

  const url = "http://localhost:3000/api/stats";
  console.log("Fetching live stats API from:", url);

  try {
    const res = await fetch(url, {
      headers: {
        Cookie: `fep_token=${token}`
      }
    });

    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("HTTP Fetch failed:", err);
  }
}

run();
