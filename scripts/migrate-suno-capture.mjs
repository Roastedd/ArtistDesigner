// Adds the "capture-from-Suno" data model:
//  - track provenance (external_source/url/id, style_prompt, imported_at)
//  - lyric_version source attribution
//  - persona_signal table (frequency-weighted style tags)
//  - track_exemplar table (pinned canonical clips)
//
// Run: node --env-file=.env.local scripts/migrate-suno-capture.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  // tracks: provenance
  `ALTER TABLE "track" ADD COLUMN IF NOT EXISTS "external_source" text`,
  `ALTER TABLE "track" ADD COLUMN IF NOT EXISTS "external_url" text`,
  `ALTER TABLE "track" ADD COLUMN IF NOT EXISTS "external_id" text`,
  `ALTER TABLE "track" ADD COLUMN IF NOT EXISTS "style_prompt" text`,
  `ALTER TABLE "track" ADD COLUMN IF NOT EXISTS "imported_at" timestamptz`,
  `CREATE INDEX IF NOT EXISTS "track_external_source_idx" ON "track" ("external_source")`,

  // lyric_version: source attribution
  `ALTER TABLE "lyric_version" ADD COLUMN IF NOT EXISTS "source" text`,
  `ALTER TABLE "lyric_version" ADD COLUMN IF NOT EXISTS "source_url" text`,

  // persona_signal
  `CREATE TABLE IF NOT EXISTS "persona_signal" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "persona_id" uuid NOT NULL REFERENCES "persona"("id") ON DELETE CASCADE,
    "signal_type" text NOT NULL,
    "value" text NOT NULL,
    "weight" integer NOT NULL DEFAULT 1,
    "last_seen_at" timestamptz NOT NULL DEFAULT now(),
    "createdAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "persona_signal_persona_idx" ON "persona_signal" ("persona_id")`,
  `CREATE INDEX IF NOT EXISTS "persona_signal_persona_type_idx" ON "persona_signal" ("persona_id", "signal_type")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "persona_signal_unique" ON "persona_signal" ("persona_id", "signal_type", "value")`,

  // track_exemplar
  `CREATE TABLE IF NOT EXISTS "track_exemplar" (
    "track_id" uuid PRIMARY KEY REFERENCES "track"("id") ON DELETE CASCADE,
    "persona_id" uuid NOT NULL REFERENCES "persona"("id") ON DELETE CASCADE,
    "style_prompt" text,
    "note" text,
    "pinned_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "track_exemplar_persona_idx" ON "track_exemplar" ("persona_id")`,
];

for (const s of statements) {
  console.log(">", s.replace(/\s+/g, " ").slice(0, 120));
  await sql.query(s);
}

console.log("\nMigration complete.");
