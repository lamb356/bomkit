import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

import { ensureEnvLoaded, getAppBaseUrl, getOptionalEnv } from '@/lib/env';

ensureEnvLoaded();

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

const DEFAULT_CALLBACK_PATH = '/dashboard';
const githubClientId = getOptionalEnv('GITHUB_ID');
const githubClientSecret = getOptionalEnv('GITHUB_SECRET');
const nextAuthSecret = getOptionalEnv('NEXTAUTH_SECRET');

export function isGitHubAuthConfigured(): boolean {
  return Boolean(githubClientId && githubClientSecret);
}

export function getGitHubAuthConfigurationError(): string | null {
  if (githubClientId && githubClientSecret) return null;
  if (!githubClientId && !githubClientSecret) return 'GitHub sign-in is not configured for this environment.';
  return 'GitHub sign-in is partially configured. Set both GITHUB_ID and GITHUB_SECRET.';
}

export function normalizeCallbackUrl(callbackUrl?: string | null): string {
  if (!callbackUrl) return DEFAULT_CALLBACK_PATH;
  if (callbackUrl.startsWith('/')) return callbackUrl;

  try {
    const parsed = new URL(callbackUrl);
    if (parsed.origin === getAppBaseUrl()) {
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
  ...(nextAuthSecret ? { secret: nextAuthSecret } : {}),
  session: { strategy: 'jwt' },
  providers: isGitHubAuthConfigured()
    ? [
        GitHubProvider({
          clientId: githubClientId!,
          clientSecret: githubClientSecret!,
        }),
      ]
    : [],
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
