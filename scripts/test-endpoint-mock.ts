import { GET } from "../src/app/api/stats/route";

async function run() {
  const mockRequest = (facultyId: string) => {
    return new Request(`http://localhost/api/stats?facultyId=${facultyId}`, {
      headers: {
        // mock auth headers if needed, but getCurrentUser mock in this process needs to be set
      }
    });
  };

  // We need to mock getCurrentUser in src/lib/auth
  const auth = require("../src/lib/auth");
  auth.getCurrentUser = async () => ({
    userId: "a949cb15-6ffe-4ddf-a3f2-44324c805da9", // Satyarth (admin)
    email: "satyarth.prakash@adda247.com",
    name: "Satyarth Prakash",
    role: "eduskill_admin"
  });

  try {
    console.log("=== Testing Admin Satyarth Prakash (should return 0 videos) ===");
    const res1 = await GET(mockRequest("a949cb15-6ffe-4ddf-a3f2-44324c805da9"));
    const data1 = await res1.json();
    console.log("Admin stats response:", JSON.stringify(data1, null, 2));

    console.log("\n=== Testing Faculty Satyarth Prakash Srivastava (should return 1 video) ===");
    const res2 = await GET(mockRequest("b7505784-33f8-40a9-9440-cdca552c8d99"));
    const data2 = await res2.json();
    console.log("Faculty stats response:", JSON.stringify(data2, null, 2));
  } catch (err) {
    console.error("Error running mock test:", err);
  }
}

run();
