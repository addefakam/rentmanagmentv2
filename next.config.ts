import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is for self-hosted bundles only (npm run build:standalone).
  // Vercel builds with the default output; forcing standalone here causes
  // routing 404s on Vercel.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
