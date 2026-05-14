import { defineConfig } from "drizzle-kit";

const url = process.env.SUPABASE_CONNECTION_STRING ?? process.env.DATABASE_URL!;

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
