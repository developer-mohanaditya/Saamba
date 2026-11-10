import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:24917';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/v2',
  experimental: {
    proxyClientMaxBodySize: '2gb',
    proxyTimeout: 300_000,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/v2',
        basePath: false,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${BACKEND_URL}/api/:path*`,
          basePath: false,
        },
        {
          source: '/api/:path*',
          destination: `${BACKEND_URL}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
