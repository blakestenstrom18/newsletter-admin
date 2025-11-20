import { z } from 'zod';

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string(),
  // Google OAuth is optional - can use email-only auth instead
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DATABASE_URL: z.string().url(),
  CRON_SECRET: z.string(),
  OPENAI_API_KEY: z.string(),
  // Google Drive is optional - newsletters are stored in database by default
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  GOOGLE_DRIVE_PARENT_FOLDER_ID: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  DEEP_RESEARCH_MODEL: z.string(),
  DEEP_RESEARCH_TIMEOUT_MS: z.number().int().positive(),
  DEEP_RESEARCH_MAX_WAIT_MS: z.number().int().positive(),
  AUTH_BCRYPT_ROUNDS: z.number().int().min(4).max(15),
  AUTH_MAX_FAILED_ATTEMPTS: z.number().int().min(3).max(20),
});

// Du
const isBuildTime = !process.env.DATABASE_URL;

const envValues = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dummy-secret-for-build',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dummy@localhost/dummy',
  CRON_SECRET: process.env.CRON_SECRET || 'dummy-cron-secret',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'dummy-openai-key',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
  NEWS_API_KEY: process.env.NEWS_API_KEY,
  DEEP_RESEARCH_MODEL: process.env.DEEP_RESEARCH_MODEL || 'o3-deep-research',
  DEEP_RESEARCH_TIMEOUT_MS: Number(process.env.DEEP_RESEARCH_TIMEOUT_MS ?? 3_600_000),
  DEEP_RESEARCH_MAX_WAIT_MS: Number(process.env.DEEP_RESEARCH_MAX_WAIT_MS ?? 900_000),
  AUTH_BCRYPT_ROUNDS: Number(process.env.AUTH_BCRYPT_ROUNDS ?? 10),
  AUTH_MAX_FAILED_ATTEMPTS: Number(process.env.AUTH_MAX_FAILED_ATTEMPTS ?? 5),
};

export const env = isBuildTime 
  ? (envValues as z.infer<typeof envSchema>)
  : envSchema.parse(envValues);

