import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    // Both methods must use one route bundle: unstable_cache includes the
    // compiled callback source in its key, which can differ across bundles.
    return [{ source: "/api/quiz/:subject/submit", destination: "/api/quiz/:subject" }];
  },
};
export default nextConfig;
