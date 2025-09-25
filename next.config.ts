import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // If you're deploying to a subdirectory, uncomment and set the basePath
  // basePath: '/personal', // Replace 'personal' with your actual repo name
};

export default nextConfig;