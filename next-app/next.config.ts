import type { NextConfig } from "next";

// NOTE: en mode standalone (Docker), cette config est figée au build.
// Les origines runtime des prods sont injectées par scripts/patch-allowed-origins.js
// (appelé dans entrypoint.sh) qui patche .next/required-server-files.json.
const allowedOrigins = ['mediahub.tsuky.ovh', '127.0.0.1:3006', 'localhost:3006', '127.0.0.1:3008', 'localhost:3008'];

if (process.env.NEXTAUTH_URL) {
  try {
    const url = new URL(process.env.NEXTAUTH_URL);
    allowedOrigins.push(url.host); // ex: tv.yonix.me ou localhost:3008
    allowedOrigins.push(url.hostname); // ex: tv.yonix.me
  } catch (e) {
    // Ignorer si l'URL est invalide
  }
}

if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  allowedOrigins.push(...customOrigins);
}

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: Array.from(new Set(allowedOrigins)),
    },
    // Cache de routeur côté client : revenir sur une page visitée il y a moins de
    // 30 s est instantané (aucun aller-retour serveur). Les server actions qui
    // appellent revalidatePath/router.refresh() invalident ce cache.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    // Imports "à la carte" pour les librairies à barrel files (bundles plus légers)
    optimizePackageImports: [
      'framer-motion',
      '@casl/ability',
      '@casl/react',
      '@tanstack/react-query',
      'react-hot-toast',
      'clsx',
      'tailwind-merge',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // Cache de 1 an pour les images optimisées
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  serverExternalPackages: ['ws'],
};

export default nextConfig;
