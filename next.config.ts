import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize output for serverless
  output: 'standalone',

  // Skip type checking during build (faster)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
