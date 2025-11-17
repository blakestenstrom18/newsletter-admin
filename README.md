# Customer Newsletter Admin

Internal admin portal for generating biweekly customer newsletters using AI.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.local.example` to `.env.local` and fill in all required values:
   - NextAuth configuration (Google OAuth)
   - Neon Postgres database URL
   - OpenAI API key
   - Google Service Account credentials
   - News API key
   - Cron secret

3. **Set up database:**
   ```bash
   # Generate migrations
   npx drizzle-kit generate
   
   # Push to database (or apply SQL manually in Neon console)
   npx drizzle-kit push
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

## Features

- ✅ Customer management (CRUD)
- ✅ Manual newsletter generation
- ✅ Scheduled newsletter generation via Vercel Cron
- ✅ Google Docs integration
- ✅ News API integration
- ✅ OpenAI-powered content synthesis
- ✅ NextAuth with Google provider
- ✅ Iterate brand theming

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components (UI and customer forms)
- `src/db/` - Drizzle ORM schema and database connection
- `src/lib/` - Utilities, types, and configuration
- `src/services/` - Business logic (news, LLM, Google, newsletter generation)
- `brand/` - Brand theming files

## Next Steps

1. Configure Vercel Cron job to call `/api/jobs/run-newsletters` with Authorization header
2. Set up Google Service Account and share Drive folder
3. Seed `internal_update` table with Iterate.ai updates
4. Add customers via the UI
