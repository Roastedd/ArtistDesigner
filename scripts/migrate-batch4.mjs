// One-shot migration for Batch 4 features.
// Run: node --env-file=.env.local scripts/migrate-batch4.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "theme" text NOT NULL DEFAULT 'dark'`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "accent_color" text`,
  `ALTER TABLE "persona" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz`,
  `ALTER TABLE "album" ADD COLUMN IF NOT EXISTS "order_index" integer NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS "persona_deleted_at_idx" ON "persona" ("deleted_at")`,
  `CREATE INDEX IF NOT EXISTS "album_order_idx" ON "album" ("persona_id", "order_index")`,
];

for (const s of statements) {
  console.log(">", s);
  await sql.query(s);
}

// Backfill orderIndex by createdAt for existing albums
console.log("> backfill album.order_index");
await sql.query(`
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY persona_id ORDER BY "createdAt") - 1 AS rn
    FROM album
  )
  UPDATE album SET order_index = ranked.rn
  FROM ranked
  WHERE album.id = ranked.id AND album.order_index = 0
`);

console.log("\nMigration complete.");
