import type { Metadata } from 'next';
import './globals.css';

import SiteChrome from '@/components/layout/site-chrome';

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
      <body className="antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
