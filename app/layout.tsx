import { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Custom Label Generator',
  description: 'Google Shopping XML Custom Label Generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
