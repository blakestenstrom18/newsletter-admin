import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = { title: 'Customer Newsletters', description: 'Internal portal' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <div className="mx-auto max-w-7xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="text-2xl font-semibold hover:opacity-80 transition-opacity">
              Customer Newsletters
            </Link>
            <ThemeToggle />
          </div>
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
