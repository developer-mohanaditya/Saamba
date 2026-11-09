import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/v2',
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
          destination: 'http://127.0.0.1:24917/api/:path*',
          basePath: false,
        },
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:24917/api/:path*',
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
