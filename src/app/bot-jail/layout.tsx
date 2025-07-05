import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Access Denied',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BotJailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
