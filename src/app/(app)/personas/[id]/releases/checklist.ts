/**
 * Release-cycle checklist with a timeline-driven structure.
 *
 * Each item has a stable `id` (used as the storage key in
 * `releases.checklist` jsonb), a `phase` bucket, a short `label`, and
 * an optional `description`. Existing rows in the DB keep working
 * because all original `prep:*`, `rights:*`, `distributor:*`,
 * `upload:*`, `promo:*`, `post:*` ids are preserved.
 */

export type ReleasePhase =
  | "concept"
  | "rights"
  | "distribution"
  | "promo_prep"
  | "outreach"
  | "launch"
  | "post_release";

export type ChecklistItem = {
  id: string;
  phase: ReleasePhase;
  label: string;
  description?: string;
};

export const PHASE_META: Record<
  ReleasePhase,
  { label: string; window: string; intent: string; weeksOut: number }
> = {
  concept: {
    label: "Concept & Audio",
    window: "≥ 4 weeks out",
    intent: "Lock the creative before anything downstream can move.",
    weeksOut: 4,
  },
  rights: {
    label: "Rights & Metadata",
    window: "3 weeks out",
    intent: "Codes, splits, and metadata DSPs and royalty systems need.",
    weeksOut: 3,
  },
  distribution: {
    label: "Distribution Setup",
    window: "2 weeks out",
    intent: "Distributor, upload, and store-front readiness.",
    weeksOut: 2,
  },
  promo_prep: {
    label: "Promo Assets",
    window: "2 weeks out",
    intent: "Everything you'll need to post on release week.",
    weeksOut: 2,
  },
  outreach: {
    label: "Outreach & Pre-Save",
    window: "1 week out",
    intent: "Get curators and your audience ready to listen.",
    weeksOut: 1,
  },
  launch: {
    label: "Launch Day",
    window: "Day of",
    intent: "Coordinated push across every channel.",
    weeksOut: 0,
  },
  post_release: {
    label: "Post-Release",
    window: "1–2 weeks after",
    intent: "Capture momentum and feed analytics into the next single.",
    weeksOut: -1,
  },
};

export const PHASE_ORDER: ReleasePhase[] = [
  "concept",
  "rights",
  "distribution",
  "promo_prep",
  "outreach",
  "launch",
  "post_release",
];

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // ── concept ──────────────────────────────────────────────
  {
    id: "prep:concept_locked",
    phase: "concept",
    label: "Concept locked",
    description: "Theme, era, and narrative for the release are decided.",
  },
  {
    id: "prep:audio_mastered",
    phase: "concept",
    label: "Audio mastered",
    description: "DSP-ready WAV at -14 LUFS integrated, true peak < -1 dB.",
  },
  {
    id: "prep:cover_art_final",
    phase: "concept",
    label: "Cover art final",
    description: "3000×3000 px, RGB, no watermarks, type passes Spotify checks.",
  },
  {
    id: "prep:bio_written",
    phase: "concept",
    label: "Artist bio + one-liner",
    description: "200–300 word bio plus a 1-sentence pitch for press.",
  },

  // ── rights ───────────────────────────────────────────────
  {
    id: "rights:isrc_assigned",
    phase: "rights",
    label: "ISRC assigned",
    description: "Per-track recording code (your distributor usually mints these).",
  },
  {
    id: "rights:upc_assigned",
    phase: "rights",
    label: "UPC assigned",
    description: "Single product barcode for the release.",
  },
  {
    id: "rights:metadata_final",
    phase: "rights",
    label: "Metadata finalized",
    description: "Title casing, featured artists, language, primary genre, mood tags.",
  },
  {
    id: "rights:splits_set",
    phase: "rights",
    label: "Splits agreed in writing",
    description: "All collaborators have signed off on songwriter + master splits.",
  },
  {
    id: "rights:publishing_registered",
    phase: "rights",
    label: "Publishing registered",
    description: "Songs registered with PRO + publishing admin (ASCAP/BMI/Songtrust/etc.).",
  },

  // ── distribution ─────────────────────────────────────────
  {
    id: "distributor:account_ready",
    phase: "distribution",
    label: "Distributor account ready",
    description: "DistroKid / TuneCore / CD Baby / UnitedMasters etc. logged in.",
  },
  {
    id: "distributor:splits_set",
    phase: "distribution",
    label: "Distributor splits configured",
    description: "Same splits as above, mirrored inside the distributor.",
  },
  {
    id: "upload:audio_uploaded",
    phase: "distribution",
    label: "Audio uploaded",
    description: "Tracks + cover uploaded; metadata matches the rights phase.",
  },
  {
    id: "upload:scheduled_date",
    phase: "distribution",
    label: "Release date scheduled",
    description: "Submitted ≥ 4 weeks ahead so Spotify editorial can consider it.",
  },
  {
    id: "distribution:spotify_for_artists",
    phase: "distribution",
    label: "Claimed in Spotify for Artists",
    description: "Submit upcoming release for editorial pitch (≥ 7 days out).",
  },
  {
    id: "distribution:apple_music_artists",
    phase: "distribution",
    label: "Claimed in Apple Music for Artists",
    description: "Profile + upcoming release verified.",
  },

  // ── promo prep ───────────────────────────────────────────
  {
    id: "promo:visual_assets",
    phase: "promo_prep",
    label: "Visual asset pack",
    description: "Square (1:1), portrait (9:16), landscape (16:9), Spotify Canvas.",
  },
  {
    id: "promo:short_clips",
    phase: "promo_prep",
    label: "Short-form clips ready",
    description: "3–5 vertical clips (15–30s) hooked on the strongest moments.",
  },
  {
    id: "promo:press_one_pager",
    phase: "promo_prep",
    label: "Press one-pager (EPK)",
    description: "PDF: bio, cover, links, quotes, contact. Sent to writers + curators.",
  },
  {
    id: "promo:lyric_video",
    phase: "promo_prep",
    label: "Lyric video / visualizer",
    description: "Even a static loop with captions outperforms no video on YouTube.",
  },

  // ── outreach ─────────────────────────────────────────────
  {
    id: "outreach:presave_link",
    phase: "outreach",
    label: "Pre-save / smartlink live",
    description: "Linkfire, Feature.fm, Hypeddit, or distributor smartlink.",
  },
  {
    id: "outreach:curator_pitch",
    phase: "outreach",
    label: "Curator outreach started",
    description: "Top 50 playlists pitched with personalized notes.",
  },
  {
    id: "outreach:email_drafted",
    phase: "outreach",
    label: "Newsletter drafted",
    description: "Two emails: tease (T-7d) + release (T-0).",
  },
  {
    id: "outreach:posts_scheduled",
    phase: "outreach",
    label: "Social posts scheduled",
    description: "T-7, T-3, T-1, T-0, T+1 across IG / TikTok / X / Threads.",
  },

  // ── launch ───────────────────────────────────────────────
  {
    id: "launch:live_check",
    phase: "launch",
    label: "Live on all DSPs",
    description: "Spotify, Apple, YouTube Music, Tidal, Amazon, Deezer.",
  },
  {
    id: "launch:smartlink_swap",
    phase: "launch",
    label: "Smartlink updated to live",
    description: "Pre-save URL now redirects to the streaming page.",
  },
  {
    id: "launch:announce_post",
    phase: "launch",
    label: "Launch posts published",
    description: "All scheduled posts pushed; pinned tweet updated.",
  },
  {
    id: "launch:newsletter_sent",
    phase: "launch",
    label: "Email blast sent",
    description: "Subject line names the song. CTA links to smartlink.",
  },
  {
    id: "launch:engage",
    phase: "launch",
    label: "Engage in real time",
    description: "Reply to every comment / DM in the first 24 hours.",
  },

  // ── post-release ─────────────────────────────────────────
  {
    id: "post:dsp_links_collected",
    phase: "post_release",
    label: "DSP links collected",
    description: "Permanent Spotify URI, Apple URL, YouTube URL stored on the release.",
  },
  {
    id: "post:smartlink_published",
    phase: "post_release",
    label: "Smartlink finalized",
    description: "All store buttons present and tested on mobile.",
  },
  {
    id: "post:repost_top_clip",
    phase: "post_release",
    label: "Boost top-performing clip",
    description: "Repost the >1k engagement moment; consider paid amplification.",
  },
  {
    id: "post:analytics_review",
    phase: "post_release",
    label: "Week-1 analytics review",
    description: "Top countries, top playlists, save rate. Note what to repeat.",
  },
  {
    id: "post:next_single_brief",
    phase: "post_release",
    label: "Next single briefed",
    description: "Lock the next era beat while attention is highest.",
  },
];

/** Stable list of every checklist key, in display order. Used by the
 *  release form action to round-trip checkbox state. */
export const RELEASE_CHECKLIST: readonly string[] = CHECKLIST_ITEMS.map(
  (i) => i.id,
);

export function itemsByPhase(): Array<{
  phase: ReleasePhase;
  items: ChecklistItem[];
}> {
  return PHASE_ORDER.map((phase) => ({
    phase,
    items: CHECKLIST_ITEMS.filter((i) => i.phase === phase),
  }));
}
