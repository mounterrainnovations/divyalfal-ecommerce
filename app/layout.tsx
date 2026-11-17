import type { Metadata } from 'next';
import './globals.css';

import NavBar from '@/components/layout/navbar';
import { siteCopy } from '@/lib/content/site-copy';

// siteCopy holds no site-level description (the hero has only the wordmark), so the
// description stays as it was rather than being invented. The title is the wordmark.
export const metadata: Metadata = {
  title: siteCopy.home.hero.wordmark,
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:bg-paper focus:px-4 focus:py-3 focus:font-ui focus:text-eyebrow focus:uppercase focus:tracking-[0.18em] focus:text-ink"
        >
          Skip to content
        </a>
        {/* No top padding: the nav is fixed and, on the home route, overlays the hero. Every
            other route is held clear of it by the spacer NavBar renders. */}
        <NavBar />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
