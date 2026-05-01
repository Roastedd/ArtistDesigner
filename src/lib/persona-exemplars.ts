import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  lyricVersions,
  personaSignals,
  trackExemplars,
  tracks,
} from "@/db/schema";

/**
 * Build a compact in-context block describing what's already worked for
 * this persona on Suno/Udio. Fed into the Forge so generations sound like
 * the artist's actual hits, not generic genre soup.
 *
 * Returns null when there's nothing useful yet (new persona).
 */
export async function loadPersonaExemplars(
  personaId: string,
  mode: "suno" | "lyrics",
): Promise<string | null> {
  // Top weighted signals — used regardless of mode.
  const signalRows = await db
    .select({
      signalType: personaSignals.signalType,
      value: personaSignals.value,
      weight: personaSignals.weight,
    })
    .from(personaSignals)
    .where(eq(personaSignals.personaId, personaId))
    .orderBy(desc(personaSignals.weight), desc(personaSignals.lastSeenAt))
    .limit(40);

  // Top exemplar tracks (style prompts + most-recent lyric body if asked).
  const exRows = await db
    .select({
      trackId: trackExemplars.trackId,
      stylePrompt: trackExemplars.stylePrompt,
      title: tracks.title,
    })
    .from(trackExemplars)
    .innerJoin(tracks, eq(tracks.id, trackExemplars.trackId))
    .where(and(eq(trackExemplars.personaId, personaId)))
    .orderBy(desc(trackExemplars.pinnedAt))
    .limit(3);

  if (signalRows.length === 0 && exRows.length === 0) return null;

  const lines: string[] = [];

  if (signalRows.length > 0) {
    const grouped: Record<string, string[]> = {};
    for (const r of signalRows) {
      (grouped[r.signalType] ??= []).push(r.value);
    }
    const order = ["genre", "mood", "vocal", "instrument", "tempo", "tag"];
    for (const t of order) {
      if (grouped[t]) {
        lines.push(`${t}: ${grouped[t].slice(0, 8).join(", ")}`);
      }
    }
  }

  if (mode === "suno" && exRows.length > 0) {
    lines.push("");
    lines.push("Past style prompts that worked:");
    for (const ex of exRows) {
      if (ex.stylePrompt) lines.push(`- "${ex.stylePrompt}"`);
    }
  }

  if (mode === "lyrics" && exRows.length > 0) {
    // Pull the most recent lyric body for each exemplar so the model sees
    // the artist's actual lyrical fingerprint.
    const ids = exRows.map((r) => r.trackId);
    const lyricSamples: { trackId: string; body: string }[] = [];
    for (const id of ids) {
      const [row] = await db
        .select({ body: lyricVersions.body })
        .from(lyricVersions)
        .where(eq(lyricVersions.trackId, id))
        .orderBy(desc(lyricVersions.createdAt))
        .limit(1);
      if (row?.body) {
        // Cap each sample at ~800 chars so we don't blow the context window.
        const trimmed =
          row.body.length > 800 ? row.body.slice(0, 800) + "\n…" : row.body;
        lyricSamples.push({ trackId: id, body: trimmed });
      }
    }

    if (lyricSamples.length > 0) {
      lines.push("");
      lines.push("Excerpts from this artist's saved hits:");
      for (let i = 0; i < lyricSamples.length; i++) {
        const ex = exRows.find((r) => r.trackId === lyricSamples[i].trackId);
        lines.push(`--- "${ex?.title ?? "Hit " + (i + 1)}" ---`);
        lines.push(lyricSamples[i].body);
      }
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
}
