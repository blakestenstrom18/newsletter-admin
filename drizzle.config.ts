import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env.local first, then .env
config({ path: '.env.local' });
config(); // This loads .env as fallback

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
});

