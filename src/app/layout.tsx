import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppShell } from '@/components/layout/app-shell';
import { siteConfig } from '@/config/site';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.publicUrl),
  title: {
    default: `${siteConfig.name} - Stats & Insights`,
    template: `%s | ${siteConfig.name}`,
  },
  description: `Explore real-time statistics, channel management, network insights, and routing analysis for the ${siteConfig.name}. AI-powered analytics for node operators.`,
  icons: {
    icon: '/favicon.svg',
  },
  keywords: ['Lightning Network', 'Bitcoin', '5satoshi', 'node', 'dashboard', 'statistics', 'analytics', 'channel management', 'routing', 'crypto', 'cryptocurrency', 'LN', 'LNURL'],
  openGraph: {
    title: `${siteConfig.name} - Stats & Insights`,
    description: `Explore real-time statistics and analytics for the ${siteConfig.name}.`,
    url: siteConfig.publicUrl,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.publicUrl}/logo.svg`,
        width: 80,
        height: 80,
        alt: `${siteConfig.name} Logo`,
      },
      {
        url: siteConfig.ogImageDefault,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} Social Preview Banner`,
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
