import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('ssh2', 'dockerode');
    }
    return config;
  },
  experimental: {
  },
  turbo: {
    resolveAlias: {
      'ssh2': 'ssh2',
      'dockerode': 'dockerode',
    },
  },
};

export default nextConfig;
