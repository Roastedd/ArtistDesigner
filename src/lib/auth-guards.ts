import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { albums, personas, tracks } from "@/db/schema";

/**
 * Shared ownership / auth guards for server actions and route handlers.
 *
 * These replace the duplicated `assertOwns*` blocks scattered across
 * action files. Each guard throws on failure (server action friendly) and
 * returns the loaded row + userId on success.
 */

class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export { AuthError, NotFoundError };

/** Get the authed user id, throwing if not signed in. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError();
  return session.user.id;
}

/** Load a persona row owned by the current user (or throw). */
export async function requireOwnedPersona(personaId: string) {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, userId)));
  if (!row) throw new NotFoundError("Persona not found");
  return { userId, persona: row };
}

/** Lightweight version that only verifies ownership and returns ids. */
export async function assertOwnsPersona(personaId: string): Promise<string> {
  const userId = await requireUserId();
  const [row] = await db
    .select({ id: personas.id })
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, userId)));
  if (!row) throw new NotFoundError("Persona not found");
  return userId;
}

/** Load an album scoped to the user, plus its persona id. */
export async function requireOwnedAlbum(albumId: string) {
  const userId = await requireUserId();
  const [row] = await db
    .select({
      album: albums,
      personaId: albums.personaId,
    })
    .from(albums)
    .innerJoin(personas, eq(personas.id, albums.personaId))
    .where(and(eq(albums.id, albumId), eq(personas.userId, userId)));
  if (!row) throw new NotFoundError("Album not found");
  return { userId, album: row.album, personaId: row.personaId };
}

/** Load a track scoped to the user, plus its persona id. */
export async function requireOwnedTrack(trackId: string) {
  const userId = await requireUserId();
  const [row] = await db
    .select({
      track: tracks,
      personaId: tracks.personaId,
    })
    .from(tracks)
    .innerJoin(personas, eq(personas.id, tracks.personaId))
    .where(and(eq(tracks.id, trackId), eq(personas.userId, userId)));
  if (!row) throw new NotFoundError("Track not found");
  return { userId, track: row.track, personaId: row.personaId };
}
