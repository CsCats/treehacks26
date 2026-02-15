import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove turbopack for production builds
  // Optimize output for serverless
  output: 'standalone',

  // Reduce bundle size
  swcMinify: true,

  // Skip type checking during build (faster)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during build (faster)
  eslint: {
    ignoreDuringBuilds: true,
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

  // Externalize heavy packages that are loaded via CDN
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle TensorFlow/MediaPipe since we load via CDN
      config.externals = config.externals || {};
      config.externals = {
        ...config.externals,
        '@tensorflow/tfjs': 'tf',
        '@tensorflow-models/pose-detection': 'poseDetection',
        '@mediapipe/pose': 'Pose',
      };
    }
    return config;
  },
};

export default nextConfig;
