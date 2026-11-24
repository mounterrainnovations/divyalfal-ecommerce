import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Hosts allowed to reach the dev server from an origin other than localhost.
   *
   * `next dev` refuses cross-origin requests for its internal endpoints — HMR, the dev
   * overlay, `/_next/*` — so a page served through a tunnel loads its HTML and then fails to
   * fetch anything else. These two patterns cover the throwaway tunnels used to put the site
   * in front of someone on another machine.
   *
   * Development only; `next build` ignores it, and it grants nothing in production.
   */
  allowedDevOrigins: ['*.trycloudflare.com', '*.loca.lt', '*.ngrok-free.app', '*.ngrok.io'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'duwwgyobnpuqsqdromzj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/**/*', './node_modules/@prisma/client/**/*'],
    '/product/**/*': ['./node_modules/.prisma/client/**/*', './node_modules/@prisma/client/**/*'],
  },
};

export default nextConfig;
