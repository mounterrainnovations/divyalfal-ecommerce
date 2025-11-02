import type { Metadata } from 'next';
import { Geist, Geist_Mono, EB_Garamond, Poppins } from 'next/font/google';
import './globals.css';

import NavBar from '@/components/layout/navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const ebGaramond = EB_Garamond({
  variable: '--font-eb-garamond',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Divyafal',
  description: 'Landing Page of Divyafal Boutique',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} ${poppins.variable} antialiased`}
      >
        <NavBar />
        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}
