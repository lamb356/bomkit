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

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || 'missing-github-id',
      clientSecret: process.env.GITHUB_SECRET || 'missing-github-secret',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser> {
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

  return {
    id: process.env.DEMO_USER_ID || 'local-demo-user',
    email: process.env.DEMO_USER_EMAIL || 'local-demo-user@local.demo',
    name: process.env.DEMO_USER_NAME || 'Local Demo User',
    image: null,
  };
}

export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
