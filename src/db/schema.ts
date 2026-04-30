import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  jsonb,
  uuid,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

/* ──────────────────────────────────────────────
   Auth.js tables (multi-tenant: each user owns
   their personas; rows are scoped via userId)
   ────────────────────────────────────────────── */
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  // Per-user UI preferences
  theme: text("theme").default("dark").notNull(), // 'dark' | 'light'
  accentColor: text("accent_color"), // hex e.g. #a78bfa, falls back to default
  // Studio profile + economy
  producerName: text("producer_name"),
  credits: integer("credits").default(5).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => [primaryKey({ columns: [a.provider, a.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (v) => [primaryKey({ columns: [v.identifier, v.token] })],
);

/* ──────────────────────────────────────────────
   Domain
   ────────────────────────────────────────────── */
export const trackStatus = pgEnum("track_status", [
  "idea",
  "prompt",
  "lyrics",
  "demo",
  "master",
  "released",
]);

export const personas = pgTable("persona", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  bio: text("bio"),
  // Sonic DNA
  genres: jsonb("genres").$type<string[]>().default([]),
  bpmMin: integer("bpm_min"),
  bpmMax: integer("bpm_max"),
  vocalStyle: text("vocal_style"),
  instrumentation: jsonb("instrumentation").$type<string[]>().default([]),
  mixAesthetic: text("mix_aesthetic"),
  // Visual DNA
  colorPalette: jsonb("color_palette").$type<string[]>().default([]),
  visualRefs: jsonb("visual_refs").$type<string[]>().default([]),
  imagePromptTemplate: text("image_prompt_template"),
  // Voice & Language
  slang: jsonb("slang").$type<string[]>().default([]),
  motifs: jsonb("motifs").$type<string[]>().default([]),
  forbiddenWords: jsonb("forbidden_words").$type<string[]>().default([]),
  influences: jsonb("influences").$type<string[]>().default([]),
  // StudioWorks-style DNA profile (all optional, auto-filled by brainstorm)
  personality: jsonb("personality").$type<string[]>().default([]),
  keyTendencies: text("key_tendencies"),
  lyricalTone: text("lyrical_tone"),
  visualAesthetic: text("visual_aesthetic"),
  themes: text("themes"),
  targetAudience: text("target_audience"),
  socialLinks: jsonb("social_links").$type<{ label: string; url: string }[]>().default([]),
  // Single locked "Persona Core" prompt block (auto-generated/edited)
  personaCore: text("persona_core"),
  isPublic: boolean("is_public").default(false).notNull(),
  // Soft-delete: rows with deletedAt set are hidden from normal lists
  // and can be restored or hard-deleted from the trash view.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("persona_user_id_idx").on(t.userId),
  // Plain (non-unique) for now to avoid breaking push if any duplicate slugs exist.
  // Slug uniqueness is enforced at the app level via slug suffixing.
  index("persona_slug_idx").on(t.slug),
  index("persona_user_created_idx").on(t.userId, t.createdAt),
  index("persona_public_idx").on(t.isPublic),
]);

export const eras = pgTable("era", {
  id: uuid("id").primaryKey().defaultRandom(),
  personaId: uuid("persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").default(0).notNull(),
  dnaOverrides: jsonb("dna_overrides").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("era_persona_idx").on(t.personaId)]);

export const albums = pgTable("album", {
  id: uuid("id").primaryKey().defaultRandom(),
  personaId: uuid("persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  eraId: uuid("era_id").references(() => eras.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  concept: text("concept"),
  coverUrl: text("cover_url"),
  orderIndex: integer("order_index").default(0).notNull(),
  releaseDate: timestamp("release_date", { mode: "date" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("album_persona_idx").on(t.personaId),
  index("album_persona_created_idx").on(t.personaId, t.createdAt),
]);

export const tracks = pgTable("track", {
  id: uuid("id").primaryKey().defaultRandom(),
  personaId: uuid("persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  albumId: uuid("album_id").references(() => albums.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  status: trackStatus("status").default("idea").notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  notes: text("notes"),
  audioUrl: text("audio_url"),
  bpm: integer("bpm"),
  keySignature: text("key_signature"),
  durationSec: integer("duration_sec"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("track_persona_idx").on(t.personaId),
  index("track_album_idx").on(t.albumId),
  index("track_persona_created_idx").on(t.personaId, t.createdAt),
  index("track_status_idx").on(t.status),
]);

export const promptVersions = pgTable("prompt_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackId: uuid("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  target: text("target").notNull(), // suno | udio | riffusion | other
  body: text("body").notNull(),
  model: text("model"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const lyricVersions = pgTable("lyric_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackId: uuid("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  structure: jsonb("structure").$type<{ section: string; text: string }[]>().default([]),
  model: text("model"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const releases = pgTable("release", {
  id: uuid("id").primaryKey().defaultRandom(),
  personaId: uuid("persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  albumId: uuid("album_id").references(() => albums.id, { onDelete: "set null" }),
  distributor: text("distributor"),
  upc: text("upc"),
  releaseDate: timestamp("release_date", { mode: "date" }),
  checklist: jsonb("checklist").$type<Record<string, boolean>>().default({}),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  emoji: text("emoji"),
  message: text("message"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

/* ────────────────────────────────────────────── */
export const personasRelations = relations(personas, ({ many }) => ({
  eras: many(eras),
  albums: many(albums),
  tracks: many(tracks),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  persona: one(personas, { fields: [tracks.personaId], references: [personas.id] }),
  album: one(albums, { fields: [tracks.albumId], references: [albums.id] }),
  prompts: many(promptVersions),
  lyrics: many(lyricVersions),
}));
