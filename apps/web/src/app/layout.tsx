import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UpdatePilot — Windows Software Update Intelligence & Management Platform',
  description: 'Enterprise Windows software update management platform with verified package detection and safe execution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-[#19C6B4]/30 selection:text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
