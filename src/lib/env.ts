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

export const env = envSchema.parse({
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  ALLOWED_DOMAIN: process.env.ALLOWED_DOMAIN,
  ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
  DATABASE_URL: process.env.DATABASE_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
  NEWS_API_KEY: process.env.NEWS_API_KEY,
});

