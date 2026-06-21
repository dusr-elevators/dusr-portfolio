import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build a self-contained server (node server.js) for the Docker runtime image.
  output: 'standalone',

  // Proxy /api to Django so the browser stays same-origin. In production nginx
  // routes /api straight to the backend (this rewrite is never reached); in dev
  // it lets the contact form post without CORS. No-op if API_INTERNAL_URL unset.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL?.replace(/\/$/, '');
    return api ? [{ source: '/api/:path*', destination: `${api}/api/:path*` }] : [];
  },
};

export default nextConfig;
