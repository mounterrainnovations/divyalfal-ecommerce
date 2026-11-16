import type { Metadata } from 'next';
import './globals.css';

import NavBar from '@/components/layout/navbar';

export const metadata: Metadata = {
  title: 'Divyafal',
  description: 'Landing Page of Divyafal Boutique',
  icons: {
    icon: '/DivyafalIcon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* The two faces used above the fold. Self-hosted, so same-origin —
            crossOrigin matches the CORS-mode fetch @font-face will make, which
            keeps the preload from being thrown away and refetched. The latin-ext
            faces load on demand via their unicode-range. */}
        <link
          rel="preload"
          href="/fonts/fraunces-var-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/jost-var-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <NavBar />
        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}
