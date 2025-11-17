import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Use a fallback connection string during build time to avoid errors
// The actual connection will be established at runtime with the real DATABASE_URL
const connectionString = process.env.DATABASE_URL || 'postgresql://dummy@localhost/dummy';
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export type Schema = typeof schema;

