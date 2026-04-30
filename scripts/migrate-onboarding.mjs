// One-shot migration for onboarding columns.
// Run: node --env-file=.env.local scripts/migrate-onboarding.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "onboarding_step" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "onboarding_platform" text`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "onboarding_dismissed" boolean NOT NULL DEFAULT false`,
];

for (const s of statements) {
  console.log(">", s);
  await sql.query(s);
}

console.log("\nMigration complete.");
