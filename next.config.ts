import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // If you're deploying to a subdirectory, uncomment and set the basePath
  // basePath: '/personal', // Replace 'personal' with your actual repo name
};

export default nextConfig;