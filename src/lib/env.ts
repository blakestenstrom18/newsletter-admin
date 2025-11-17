import { z } from 'zod';

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  ALLOWED_DOMAIN: z.string().optional(),
  ALLOWED_EMAILS: z.string().optional(),
  DATABASE_URL: z.string().url(),
  CRON_SECRET: z.string(),
  OPENAI_API_KEY: z.string(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string(),
  GOOGLE_DRIVE_PARENT_FOLDER_ID: z.string(),
  NEWS_API_KEY: z.string(),
});

// During build time, provide dummy values to avoid validation errors
// These will only be used for type checking, not actual runtime execution
const isBuildTime = !process.env.DATABASE_URL;

const envValues = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dummy-secret-for-build',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
  ALLOWED_DOMAIN: process.env.ALLOWED_DOMAIN,
  ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dummy@localhost/dummy',
  CRON_SECRET: process.env.CRON_SECRET || 'dummy-cron-secret',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'dummy-openai-key',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'dummy@example.com',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || 'dummy-private-key',
  GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || 'dummy-folder-id',
  NEWS_API_KEY: process.env.NEWS_API_KEY || 'dummy-news-key',
};

export const env = isBuildTime 
  ? (envValues as z.infer<typeof envSchema>)
  : envSchema.parse(envValues);

