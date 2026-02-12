import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env.local specifically
dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/schema.ts", // (Make sure this path is correct!)
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Now this will be populated
  },
});