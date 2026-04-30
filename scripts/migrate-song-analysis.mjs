// One-shot migration for the song_analysis table.
// Run: node --env-file=.env.local scripts/migrate-song-analysis.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS "song_analysis" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "track_id" uuid REFERENCES "track"("id") ON DELETE SET NULL,
    "audio_url" text NOT NULL,
    "context_genre" text,
    "context_notes" text,
    "result" jsonb,
    "model" text,
    "createdAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "song_analysis_user_idx" ON "song_analysis" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "song_analysis_track_idx" ON "song_analysis" ("track_id")`,
];

for (const s of statements) {
  console.log(">", s.split("\n")[0]);
  await sql.query(s);
}

console.log("\nMigration complete.");
