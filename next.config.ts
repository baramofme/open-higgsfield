import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the split-shell origin (:7860) and both IP/localhost forms so Next's
  // dev JS chunks + HMR are served instead of blocked. Without this the client
  // bundle never loads, hydration never happens, and every click is a no-op.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "http://127.0.0.1:3100",
    "http://localhost:3100",
    "http://127.0.0.1:7860",
    "http://localhost:7860",
  ],
};

export default nextConfig;
