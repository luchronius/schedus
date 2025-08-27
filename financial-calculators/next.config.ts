import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Environment variable configuration for flexible deployment
  env: {
    // This ensures NEXTAUTH_URL can be dynamically set based on deployment environment
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 
      (process.env.NODE_ENV === 'production' 
        ? process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
        : undefined), // Let NextAuth auto-detect in development
  },
};

export default nextConfig;
