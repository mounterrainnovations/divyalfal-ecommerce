import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'duwwgyobnpuqsqdromzj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    unoptimized: false,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/**/*', './node_modules/@prisma/client/**/*'],
  },
};

export default nextConfig;
