import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.25.157.210', 'localhost', '127.0.0.1'],
  // Or to allow any origin during development (less secure but easier):
  // allowedDevOrigins: ['*'],
};

export default nextConfig;
