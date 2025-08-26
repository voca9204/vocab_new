import type { NextConfig } from "next";

// Temporarily disable PWA due to Next.js 15 compatibility issues
// const withPWA = require('next-pwa')({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === 'development',
//   buildExcludes: [/middleware-manifest\.json$/],
//   fallbacks: {
//     document: '/offline.html',
//   },
//   // ... runtime caching configuration
// })

const nextConfig: NextConfig = {
  transpilePackages: ['firebase', 'firebase-admin'],
  swcMinify: true,
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Disable webpack optimization temporarily
    config.optimization.minimize = false;
    return config;
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

// export default withPWA(nextConfig);
export default nextConfig;
