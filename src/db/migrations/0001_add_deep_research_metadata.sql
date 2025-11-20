ALTER TABLE "newsletter_run" ADD COLUMN IF NOT EXISTS "research_response_id" varchar(128);
ALTER TABLE "newsletter_run" ADD COLUMN IF NOT EXISTS "research_payload" jsonb;

