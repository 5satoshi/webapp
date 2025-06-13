import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppShell } from '@/components/layout/app-shell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const siteBaseUrl = 'https://www.five-satoshi.com'; // IMPORTANT: Update if your production domain is different

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl),
  title: {
    default: '5satoshi Lightning Node Dashboard - Stats & Insights',
    template: '%s | 5satoshi Dashboard',
  },
  description: 'Explore real-time statistics, channel management, network insights, and routing analysis for the 5satoshi Lightning Network node. AI-powered analytics for node operators.',
  icons: {
    icon: '/favicon.svg', // Updated to new SVG favicon
    // apple: '/apple-icon.png', // Optional: if you have apple touch icons
  },
  keywords: ['Lightning Network', 'Bitcoin', '5satoshi', 'node', 'dashboard', 'statistics', 'analytics', 'channel management', 'routing', 'crypto', 'cryptocurrency', 'LN', 'LNURL'],
  openGraph: {
    title: '5satoshi Lightning Node Dashboard - Stats & Insights',
    description: 'Explore real-time statistics and analytics for the 5satoshi Lightning Network node.',
    url: siteBaseUrl,
    siteName: '5satoshi Lightning Stats Dashboard',
    images: [
      {
        url: `${siteBaseUrl}/logo.svg`, // Updated to use the new logo.svg for social preview
        width: 80, // SVG width
        height: 80, // SVG height
        alt: '5satoshi Lightning Dashboard Logo',
      },
      {
        url: 'https://placehold.co/1200x630.png', 
        width: 1200,
        height: 630,
        alt: '5satoshi Lightning Dashboard Social Preview Banner',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased`}>
        <AppShell>
          {children}
        </AppShell>
        <Toaster />
      </body>
    </html>
  );
}
