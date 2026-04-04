import fs from 'node:fs';
import path from 'node:path';

import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

function hydrateEnvFromLocalFile(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq);
    if (process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('<') && value.endsWith('>')) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

hydrateEnvFromLocalFile();

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

const DEFAULT_CALLBACK_PATH = '/dashboard';

export function normalizeCallbackUrl(callbackUrl?: string | null): string {
  if (!callbackUrl) return DEFAULT_CALLBACK_PATH;
  if (callbackUrl.startsWith('/')) return callbackUrl;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    const parsed = new URL(callbackUrl);
    if (baseUrl && parsed.origin === new URL(baseUrl).origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Fall through to default callback path.
  }

  return DEFAULT_CALLBACK_PATH;
}

export function buildSignInHref(callbackUrl?: string | null): string {
  const target = normalizeCallbackUrl(callbackUrl);
  return target === DEFAULT_CALLBACK_PATH
    ? '/signin'
    : `/signin?callbackUrl=${encodeURIComponent(target)}`;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || 'missing-github-id',
      clientSecret: process.env.GITHUB_SECRET || 'missing-github-secret',
    }),
  ],
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) {
          return url;
        }
      } catch {
        // Ignore invalid redirect targets.
      }

      return baseUrl;
    },
  },
};

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; email?: string | null; name?: string | null; image?: string | null } | undefined;
  if (sessionUser?.id) {
    return {
      id: sessionUser.id,
      email: sessionUser.email ?? null,
      name: sessionUser.name ?? null,
      image: sessionUser.image ?? null,
    };
  }

  if (!isDemoModeEnabled()) {
    return null;
  }

  return {
    id: process.env.DEMO_USER_ID || 'local-demo-user',
    email: process.env.DEMO_USER_EMAIL || 'local-demo-user@local.demo',
    name: process.env.DEMO_USER_NAME || 'Local Demo User',
    image: null,
  };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return user;
}

export async function getCurrentUserId(): Promise<string> {
  return (await requireCurrentUser()).id;
}
