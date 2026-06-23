import { config } from "dotenv";
config({ path: "/Users/adda247/FEP Adda247/fep-dashboard/.env.local" });

import { signToken } from "../src/lib/auth";
import { jwtVerify } from "jose";

async function run() {
  const secretStr = process.env.JWT_SECRET || "dev-secret-change-me";
  console.log("Secret string:", JSON.stringify(secretStr));
  console.log("Secret string length:", secretStr.length);

  const payload = {
    userId: "a949cb15-6ffe-4ddf-a3f2-44324c805da9",
    email: "satyarth.prakash@adda247.com",
    name: "Satyarth Prakash",
    role: "eduskill_admin" as const
  };

  const token = await signToken(payload);
  console.log("Token:", token);

  const secretKey = new TextEncoder().encode(secretStr);
  
  try {
    const verified = await jwtVerify(token, secretKey);
    console.log("Verification success:", verified.payload);
  } catch (err: any) {
    console.error("Verification failed:", err.message);
  }
}

run().catch(console.error);
