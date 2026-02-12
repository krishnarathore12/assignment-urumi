import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "./schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  plugins: [nextCookies()],
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
});
