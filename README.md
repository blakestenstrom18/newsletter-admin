# Customer Newsletter Admin

Internal admin portal for generating biweekly customer newsletters using AI.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.local.example` to `.env.local` (see `ENV_VARIABLES.md` for the full list) and fill in:
   - NextAuth config: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
   - Auth tuning: `AUTH_BCRYPT_ROUNDS`, `AUTH_MAX_FAILED_ATTEMPTS`
   - Neon Postgres database URL
   - OpenAI API key
   - Deep research config: `DEEP_RESEARCH_MODEL`, `DEEP_RESEARCH_TIMEOUT_MS`, `DEEP_RESEARCH_MAX_WAIT_MS`
   - Google Service Account credentials (optional, for Docs export)
   - Cron secret
   - `NEWS_API_KEY` is optional and only needed for the legacy fallback

3. **Set up database:**
   ```bash
   # Generate migrations
   npx drizzle-kit generate
   
   # Push to database (or apply SQL manually in Neon console)
   npx drizzle-kit push
   ```

4. **Create your first admin user:**
   ```bash
   npm run users:create
   ```
   The script prompts for email, password, role, and active state. Run it again any time you need to onboard or update a teammate.

5. **Run development server:**
   ```bash
   npm run dev
   ```

## Features

- ✅ Customer management (CRUD)
- ✅ Manual newsletter generation
- ✅ Scheduled newsletter generation via Vercel Cron
- ✅ Google Docs integration
- ✅ Deep research-powered news aggregation (OpenAI Responses API)
- ✅ News API fallback (optional)
- ✅ OpenAI-powered content synthesis
- ✅ Secure username/password auth (NextAuth Credentials provider)
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
4. Invite teammates by creating accounts via `npm run users:create`
