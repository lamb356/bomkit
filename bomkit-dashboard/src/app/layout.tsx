import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BOMKit Dashboard',
  description: 'Persistent BOM workspace with JLC fee intelligence for KiCad.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold text-zinc-950">BOMKit Dashboard</Link>
            <nav className="flex gap-4 text-sm text-zinc-600">
              <Link href="/dashboard">Projects</Link>
              <a href="/api/auth/signin">Sign in</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
