# Database Migration Guide

This guide explains how to migrate and seed your Neon database.

## Prerequisites

1. **Neon Database Connected**
   - You should have a `DATABASE_URL` in your `.env.local` file
   - Format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

2. **Environment Variables**
   - Make sure `.env.local` exists with `DATABASE_URL` set

## Migration Steps

### Option 1: Using Drizzle Kit Push (Recommended - Easiest)

This automatically syncs your schema to the database:

```bash
cd newsletter-admin
npm run db:push
```

**Important:** Make sure your `.env.local` file has `DATABASE_URL` set!

This will:
- Compare your schema with the database
- Prompt you to confirm changes (select "Yes, I want to execute all statements")
- Automatically create/update tables, columns, and constraints
- Handle the new `content` column in `newsletter_run` table

**Note:** `drizzle-kit push` is great for development. For production, consider using migrations (Option 2).

### Option 2: Generate and Apply Migrations (Production-Ready)

This creates migration files you can review and apply:

```bash
cd newsletter-admin

# Step 1: Generate migration files
npm run db:generate

# Step 2: Review the generated SQL in src/db/migrations/

# Step 3: Apply migrations
npm run db:push
```

Or manually apply via Neon Console:
1. Go to Neon Dashboard → SQL Editor
2. Copy the SQL from `src/db/migrations/XXXX_*.sql`
3. Paste and run in the SQL Editor

### Option 3: Manual SQL (If Needed)

If you need to manually add just the `content` column:

```sql
-- Add content column to newsletter_run table
ALTER TABLE newsletter_run 
ADD COLUMN IF NOT EXISTS content JSONB;
```

Run this in Neon Dashboard → SQL Editor.

## Verify Migration

After running migrations, verify the schema:

```bash
# Open Drizzle Studio to view your database
npm run db:studio
```

This opens a web UI at `http://localhost:4983` where you can:
- View all tables
- See the schema
- Browse data
- Verify the `content` column exists in `newsletter_run`

## Seeding Data (Optional)

If you want to seed initial data, you can create a seed script:

**Create `src/db/seed.ts`:**

```typescript
import { db } from './index';
import { internalUpdate } from './schema';

async function seed() {
  // Example: Seed internal updates
  await db.insert(internalUpdate).values([
    {
      title: 'New Feature Launch',
      body: 'We launched a new feature that helps customers...',
      sourceUrl: 'https://iterate.ai/blog/new-feature',
      active: true,
    },
    // Add more updates as needed
  ]);

  console.log('✅ Database seeded successfully');
}

seed().catch(console.error);
```

Then add to `package.json`:
```json
"db:seed": "tsx src/db/seed.ts"
```

Run with:
```bash
npm run db:seed
```

## Troubleshooting

### Error: "relation does not exist"
- Make sure you've run migrations first
- Check that `DATABASE_URL` is correct
- Verify you're connected to the right database

### Error: "column already exists"
- The column might already exist
- Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to avoid errors
- Or drop and recreate if needed (be careful with data!)

### Migration files not generating
- Make sure `drizzle.config.ts` is configured correctly
- Check that `src/db/schema.ts` has no syntax errors
- Verify `DATABASE_URL` is set in `.env.local`

## What Gets Created

After migration, you'll have these tables:

1. **customer_config** - Customer configurations and settings
2. **newsletter_run** - Newsletter generation runs and content
3. **internal_update** - Internal updates from Iterate.ai

Plus these enums:
- `frequency` - weekly, biweekly, monthly
- `tone` - formal, consultative, friendly_exec, concise

## Next Steps

After migration:
1. ✅ Verify tables exist using `npm run db:studio`
2. ✅ Test creating a customer via the UI
3. ✅ Test generating a newsletter
4. ✅ Verify newsletter content is stored in the `content` column

