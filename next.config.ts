
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: ['https://6000-firebase-studio-1749296854629.cluster-jbb3mjctu5cbgsi6hwq6u4btwe.cloudworkstations.dev'],
  },
};

export default nextConfig;
