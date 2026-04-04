import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { ensureEnvLoaded, requireEnv } from '@/lib/env';

import * as schema from './schema';

ensureEnvLoaded();

const sql = neon(requireEnv('DATABASE_URL'));
export const db = drizzle(sql, { schema });
