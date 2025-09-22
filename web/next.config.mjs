/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },
  // Ensures app-router pages aren’t exported statically by accident
  output: undefined,
};

module.exports = nextConfig;
