import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const cols = await sql`
  SELECT table_name, column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND ((table_name = 'user' AND column_name IN ('theme', 'accent_color'))
      OR (table_name = 'persona' AND column_name = 'deleted_at')
      OR (table_name = 'album' AND column_name = 'order_index'))
  ORDER BY table_name, column_name
`;
console.log("New columns:");
console.table(cols);

const idx = await sql`
  SELECT indexname, tablename FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN ('persona_deleted_at_idx', 'album_order_idx')
`;
console.log("Indexes:");
console.table(idx);

const counts = await sql`
  SELECT
    (SELECT COUNT(*) FROM "user")::int AS users,
    (SELECT COUNT(*) FROM persona)::int AS personas,
    (SELECT COUNT(*) FROM persona WHERE deleted_at IS NOT NULL)::int AS personas_trashed,
    (SELECT COUNT(*) FROM album)::int AS albums,
    (SELECT COUNT(*) FROM track)::int AS tracks
`;
console.log("Row counts:");
console.table(counts);
