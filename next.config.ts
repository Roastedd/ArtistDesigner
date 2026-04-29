import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow any external host for user-supplied cover art URLs
    remotePatterns: [
      { protocol: "https", hostname: "*" },
      { protocol: "http", hostname: "*" },
    ],
  },
};

export default nextConfig;
