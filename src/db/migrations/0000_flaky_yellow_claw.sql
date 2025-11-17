CREATE TYPE "public"."frequency" AS ENUM('weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."tone" AS ENUM('formal', 'consultative', 'friendly_exec', 'concise');--> statement-breakpoint
CREATE TABLE "customer_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"aliases" text[] DEFAULT '{}',
	"industry" varchar(128) NOT NULL,
	"sub_verticals" text[] DEFAULT '{}',
	"website_url" varchar(512),
	"hq_country" varchar(64),
	"public_company" boolean DEFAULT false,
	"stock_ticker" varchar(16),
	"active" boolean DEFAULT true NOT NULL,
	"frequency" "frequency" DEFAULT 'biweekly' NOT NULL,
	"timezone" varchar(64) DEFAULT 'America/Denver' NOT NULL,
	"tone" "tone" DEFAULT 'friendly_exec' NOT NULL,
	"max_items_per_section" integer DEFAULT 4 NOT NULL,
	"pr_urls" text[] DEFAULT '{}',
	"news_keywords" text[] DEFAULT '{}',
	"competitors" text[] DEFAULT '{}',
	"regions_of_interest" text[] DEFAULT '{}',
	"account_owner_name" varchar(128),
	"account_owner_email" varchar(256),
	"primary_stakeholders" jsonb DEFAULT '[]'::jsonb,
	"key_priorities" text[] DEFAULT '{}',
	"sensitive_topics" text[] DEFAULT '{}',
	"current_initiatives" text,
	"internal_doc_url" varchar(512),
	"roadmap_alignment" text[] DEFAULT '{}',
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "internal_update" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"body" text,
	"source_url" varchar(512),
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletter_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"trigger_type" varchar(16) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"content" jsonb,
	"google_doc_id" varchar(128),
	"google_doc_url" varchar(512),
	"started_at" timestamp with time zone DEFAULT now(),
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "newsletter_run" ADD CONSTRAINT "newsletter_run_customer_id_customer_config_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_config"("id") ON DELETE cascade ON UPDATE no action;