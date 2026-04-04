import type { Metadata } from 'next';
import { Geist_Mono, Inter } from 'next/font/google';
import Link from 'next/link';

import './globals.css';
import { buildSignInHref } from '@/lib/auth';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BOMKit Dashboard',
  description: 'Persistent BOM workspace with JLC fee intelligence for KiCad.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0a0d14] text-zinc-100 selection:bg-cyan-400/30 selection:text-white">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0d14]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-tight text-white transition hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14]">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.12)]">BK</span>
              <span className="flex flex-col">
                <span>BOMKit Dashboard</span>
                <span className="text-[11px] font-medium text-zinc-500">Persistent BOM intelligence</span>
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm text-zinc-400">
              <Link href="/dashboard" className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Projects</Link>
              <a href={buildSignInHref('/dashboard')} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-medium text-zinc-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Sign in</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
