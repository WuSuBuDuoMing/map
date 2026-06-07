import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": ["data/*.private.json"],
  },
  // Performance optimizations
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  images: {
    unoptimized: true, // We handle image optimization ourselves
    minimumCacheTTL: 60 * 60 * 24, // Cache images for 24 hours
  },
  // Experimental features
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"], // Tree-shake large packages
  },
};

export default nextConfig;
