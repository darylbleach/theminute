import type { NextConfig } from "next";

// Retired auction pages. 301 to the stand-up timer so old links stop looking live.
const retiredAuctionPaths = [
  "/buy",
  "/queue",
  "/archive",
  "/longest",
  "/success",
  "/reign/:path*",
  "/go/:path*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["stripe"],
  async redirects() {
    return retiredAuctionPaths.map((source) => ({
      source,
      destination: "/",
      statusCode: 301,
    }));
  },
};

export default nextConfig;
