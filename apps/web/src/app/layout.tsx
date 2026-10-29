import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UpdatePilot — Software Update Intelligence & Management Platform',
  description: 'Windows-first software update management platform with verified package detection and safe execution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-[#F06435] selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
