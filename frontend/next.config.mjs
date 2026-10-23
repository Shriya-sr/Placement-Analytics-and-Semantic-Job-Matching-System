/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server action & external packages if needed
  experimental: {
    serverComponentsExternalPackages: ['mysql2'],
  },
};

export default nextConfig;
