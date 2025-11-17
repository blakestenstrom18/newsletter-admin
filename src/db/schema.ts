import {
  pgTable, text, varchar, boolean, timestamp, jsonb, uuid, integer, pgEnum
} from 'drizzle-orm/pg-core';

export const frequencyEnum = pgEnum('frequency', ['weekly','biweekly','monthly']);
export const toneEnum = pgEnum('tone', ['formal','consultative','friendly_exec','concise']);

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
  googleDocId: varchar('google_doc_id', { length: 128 }),
  googleDocUrl: varchar('google_doc_url', { length: 512 }),
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

