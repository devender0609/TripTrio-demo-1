/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },

  // Ensure these pages aren’t statically exported
  // (remove this if you intentionally use `output: 'export'`)
  output: undefined,

  // If you added rewrites/headers, keep them here as functions
  // async rewrites() { return []; },
  // async headers() { return []; },
};

export default nextConfig;
