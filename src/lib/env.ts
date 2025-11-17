import { z } from 'zod';

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string(),
  // Google OAuth is optional - can use email-only auth instead
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // At least one of ALLOWED_DOMAIN or ALLOWED_EMAILS must be set
  ALLOWED_DOMAIN: z.string().optional(),
  ALLOWED_EMAILS: z.string().optional(),
  DATABASE_URL: z.string().url(),
  CRON_SECRET: z.string(),
  OPENAI_API_KEY: z.string(),
  // Google Drive is optional - newsletters are stored in database by default
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  GOOGLE_DRIVE_PARENT_FOLDER_ID: z.string().optional(),
  NEWS_API_KEY: z.string(),
});

// During build time, provide dummy values to avoid validation errors
// These will only be used for type checking, not actual runtime execution
const isBuildTime = !process.env.DATABASE_URL;

const envValues = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dummy-secret-for-build',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  ALLOWED_DOMAIN: process.env.ALLOWED_DOMAIN,
  ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dummy@localhost/dummy',
  CRON_SECRET: process.env.CRON_SECRET || 'dummy-cron-secret',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'dummy-openai-key',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
  NEWS_API_KEY: process.env.NEWS_API_KEY || 'dummy-news-key',
};

export const env = isBuildTime 
  ? (envValues as z.infer<typeof envSchema>)
  : envSchema.parse(envValues);

