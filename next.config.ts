import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow network testing without cross-origin dev resource blocking
  allowedDevOrigins: ["192.168.18.48", "localhost:3000"],

  // Turbopack enabled by default in Next.js 16 — empty config silences
  // the webpack-vs-turbopack conflict error (next.config.js webpack alias removed)
  turbopack: {},

  // Image optimization for Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
