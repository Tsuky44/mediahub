import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'plex.tv',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('ssh2', 'dockerode');
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://mediahub-tracker:3005/socket.io/:path*',
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['ws', '@microsoft/signalr'],
  },
};

export default nextConfig;
