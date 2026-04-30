import { ImageResponse } from "next/og";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { personas } from "@/db/schema";

export const runtime = "nodejs";
export const alt = "ArtistDesigner persona";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { slug: string } }) {
  const [p] = await db
    .select()
    .from(personas)
    .where(
      and(
        eq(personas.slug, params.slug),
        eq(personas.isPublic, true),
        isNull(personas.deletedAt),
      ),
    );

  const palette = (p?.colorPalette ?? []).slice(0, 5);
  const gradient =
    palette.length >= 2
      ? `linear-gradient(135deg, ${palette.join(", ")})`
      : "linear-gradient(135deg, #1a1a1f, #0a0a0b)";

  const name = p?.name ?? "ArtistDesigner";
  const tagline = p?.tagline ?? "";
  const genres = (p?.genres ?? []).slice(0, 4).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: gradient,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            opacity: 0.75,
            fontFamily: "monospace",
            letterSpacing: 1,
          }}
        >
          artistdesigner.app/p/{p?.slug ?? params.slug}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 110,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            {name}
          </div>
          {tagline && (
            <div style={{ fontSize: 32, opacity: 0.9, maxWidth: 1000 }}>
              {tagline}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            opacity: 0.85,
          }}
        >
          <div>{genres}</div>
          <div>made with ArtistDesigner</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
