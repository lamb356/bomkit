import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAppBaseUrl, getAppUrl } from '../env';

const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('env helpers', () => {
  it('uses NEXTAUTH_URL origin for the base URL', () => {
    process.env.NEXTAUTH_URL = 'https://bomkit.dev/dashboard?foo=bar';
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppBaseUrl()).toBe('https://bomkit.dev');
    expect(getAppUrl('/dashboard?checkout=success')).toBe('https://bomkit.dev/dashboard?checkout=success');
  });

  it('falls back to NEXT_PUBLIC_APP_URL', () => {
    delete process.env.NEXTAUTH_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:3000';

    expect(getAppBaseUrl()).toBe('http://127.0.0.1:3000');
  });

  it('rejects insecure production URLs', () => {
    process.env.NEXTAUTH_URL = 'http://bomkit.dev';
    process.env.NODE_ENV = 'production';

    expect(() => getAppBaseUrl()).toThrow('Production app URL must use https');
  });
});
