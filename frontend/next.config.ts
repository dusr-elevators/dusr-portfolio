import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build a self-contained server (node server.js) for the Docker runtime image.
  output: 'standalone',

  images: {
    unoptimized: true, // Allow next/image to load from /media and /static without optimization
    remotePatterns: [
      { protocol: 'https', hostname: 'dusr.sa' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'backend' },
    ],
  },

  // Proxy /api to Django so the browser stays same-origin. In production nginx
  // routes /api straight to the backend (this rewrite is never reached); in dev
  // it lets the contact form post without CORS. No-op if API_INTERNAL_URL unset.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL?.replace(/\/$/, '');
    return api
      ? [
          { source: '/api/:path*', destination: `${api}/api/:path*` },
          { source: '/media/:path*', destination: `${api}/media/:path*` },
        ]
      : [];
  },
};

export default nextConfig;
