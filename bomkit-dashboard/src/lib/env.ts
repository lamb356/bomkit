import { loadEnvConfig } from '@next/env';

let loaded = false;

export function ensureEnvLoaded(): void {
  if (loaded) return;
  loadEnvConfig(process.cwd());
  loaded = true;
}

export function getOptionalEnv(name: string): string | undefined {
  ensureEnvLoaded();
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function requireEnv(name: string): string {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`${name} is required for bomkit-dashboard`);
  }
  return value;
}

export function getAppBaseUrl(): string {
  const value = getOptionalEnv('NEXTAUTH_URL') ?? getOptionalEnv('NEXT_PUBLIC_APP_URL');
  if (!value) {
    throw new Error('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL must be configured for bomkit-dashboard');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL must be a valid absolute URL');
  }

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Production app URL must use https');
  }

  return parsed.origin;
}

export function getAppUrl(pathname = '/'): string {
  return new URL(pathname, `${getAppBaseUrl()}/`).toString();
}
