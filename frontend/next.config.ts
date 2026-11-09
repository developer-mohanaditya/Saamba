import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/v2',
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
};

export default nextConfig;
