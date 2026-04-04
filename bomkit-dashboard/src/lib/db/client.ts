import fs from 'node:fs';
import path from 'node:path';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

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
    if (value.startsWith('<') && value.endsWith('>')) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

hydrateEnvFromLocalFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for bomkit-dashboard');
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
