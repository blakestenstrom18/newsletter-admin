import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  uuid,
  integer,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const frequencyEnum = pgEnum('frequency', ['weekly','biweekly','monthly']);
export const toneEnum = pgEnum('tone', ['formal','consultative','friendly_exec','concise']);
export const userRoleEnum = pgEnum('user_role', ['admin','user']);

export const userAccount = pgTable('user_account', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 256 }).notNull(),
  username: varchar('username', { length: 128 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('user_account_email_idx').on(table.email),
}));

export const customerConfig = pgTable('customer_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  aliases: text('aliases').array().default([]),
  industry: varchar('industry', { length: 128 }).notNull(),
  subVerticals: text('sub_verticals').array().default([]),
  websiteUrl: varchar('website_url', { length: 512 }),
  hqCountry: varchar('hq_country', { length: 64 }),
  publicCompany: boolean('public_company').default(false),
  stockTicker: varchar('stock_ticker', { length: 16 }),

  // Newsletter settings
  active: boolean('active').notNull().default(true),
  frequency: frequencyEnum('frequency').notNull().default('biweekly'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('America/Denver'),
  tone: toneEnum('tone').notNull().default('friendly_exec'),
  maxItemsPerSection: integer('max_items_per_section').notNull().default(4),

  // PR & news config
  prUrls: text('pr_urls').array().default([]),
  newsKeywords: text('news_keywords').array().default([]),
  competitors: text('competitors').array().default([]),
  regionsOfInterest: text('regions_of_interest').array().default([]),

  // Personalization & relationship
  accountOwnerName: varchar('account_owner_name', { length: 128 }),
  accountOwnerEmail: varchar('account_owner_email', { length: 256 }),
  primaryStakeholders: jsonb('primary_stakeholders').$type<Array<{
    name: string; title?: string; focus_areas?: string[];
  }>>().default([]),
  keyPriorities: text('key_priorities').array().default([]),
  sensitiveTopics: text('sensitive_topics').array().default([]),

  // Iterate context
  currentInitiatives: text('current_initiatives'),
  internalDocUrl: varchar('internal_doc_url', { length: 512 }),
  roadmapAlignment: text('roadmap_alignment').array().default([]),

  // scheduling
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const newsletterRun = pgTable('newsletter_run', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customerConfig.id, { onDelete: 'cascade' }),
  triggerType: varchar('trigger_type', { length: 16 }).notNull(), // "scheduled" | "manual"
  status: varchar('status', { length: 16 }).notNull().default('pending'), // pending|success|error
  errorMessage: text('error_message'),
  // Newsletter content stored in database (no Google Drive required)
  content: jsonb('content').$type<{
    executiveSummary: string;
    customerHighlights: Array<{ summary: string; implication: string; sourceUrl?: string }>;
    industryTrends: Array<{ trend: string; implication: string; sourceUrl?: string }>;
    iterateUpdates: Array<{ update: string; sourceUrl?: string }>;
    futureIdeas: Array<{ idea: string; value: string }>;
    generatedAtIso: string;
  }>(),
  // Google Drive fields (optional - only used if Google credentials are provided)
  googleDocId: varchar('google_doc_id', { length: 128 }),
  googleDocUrl: varchar('google_doc_url', { length: 512 }),
  researchResponseId: varchar('research_response_id', { length: 128 }),
  researchPayload: jsonb('research_payload').$type<{
    structured?: {
      customerNews?: Array<Record<string, unknown>>;
      competitorNews?: Array<Record<string, unknown>>;
      industryTrends?: Array<Record<string, unknown>>;
    };
    rawText?: string;
  }>(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const internalUpdate = pgTable('internal_update', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  body: text('body'),
  sourceUrl: varchar('source_url', { length: 512 }),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

