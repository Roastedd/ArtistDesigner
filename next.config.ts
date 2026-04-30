import type { NextConfig } from "next";

/**
 * Image remotePatterns allowlist.
 *
 * Previously this was `hostname: "*"` which let any user-supplied cover/audio
 * URL be proxied through next/image — an SSRF surface. Restrict to hosts we
 * actually serve from. Extend via the NEXT_IMAGE_REMOTE_HOSTS env var
 * (comma-separated) without touching code.
 */
function buildRemotePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const patterns: NonNullable<
    NonNullable<NextConfig["images"]>["remotePatterns"]
  > = [
    // Free image generator used by generateAlbumCover()
    { protocol: "https", hostname: "image.pollinations.ai" },
    // Common OAuth avatar hosts
    { protocol: "https", hostname: "avatars.githubusercontent.com" },
    { protocol: "https", hostname: "lh3.googleusercontent.com" },
  ];

  // Cloudflare R2 public bucket — host derived from R2_PUBLIC_URL.
  const r2Public = process.env.R2_PUBLIC_URL;
  if (r2Public) {
    try {
      const url = new URL(r2Public);
      patterns.push({
        protocol: (url.protocol.replace(":", "") as "http" | "https") || "https",
        hostname: url.hostname,
      });
    } catch {
      // Bad R2_PUBLIC_URL — runtime upload code will surface the misconfig.
    }
  }

  const extra = process.env.NEXT_IMAGE_REMOTE_HOSTS;
  if (extra) {
    for (const host of extra
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)) {
      patterns.push({ protocol: "https", hostname: host });
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

export default nextConfig;
