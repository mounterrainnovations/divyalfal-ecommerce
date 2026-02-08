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
      <body className="antialiased">
        <NavBar />
        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}
