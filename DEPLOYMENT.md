# Deployment Guide

Complete step-by-step guide for deploying the Customer Newsletter Admin to Vercel.

## Prerequisites

- GitHub account (for connecting to Vercel)
- Vercel account
- Neon account (for Postgres)
- Google Cloud Console access (for OAuth and Service Account)
- OpenAI API key
- News API key

---

## Step 1: Set Up Neon Postgres Database

1. **Create Neon Account & Database**
   - Go to [neon.tech](https://neon.tech) and sign up/login
   - Click "Create Project"
   - Choose a name (e.g., `newsletter-admin`)
   - Select a region close to your users
   - Click "Create Project"

2. **Get Connection String**
   - After project creation, you'll see the connection string
   - Copy the connection string (format: `postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
   - **Save this for Step 4** - you'll need it for Vercel environment variables

3. **Note the Database URL**
   - The connection string is your `DATABASE_URL`
   - Keep this secure - you'll add it to Vercel environment variables

---

## Step 2: Deploy to Vercel

1. **Push Code to GitHub**
   ```bash
   cd newsletter-admin
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import Project to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings
   - **Don't deploy yet** - we need to set environment variables first

---

## Step 3: Configure Environment Variables in Vercel

1. **In Vercel Project Settings**
   - Go to your project → Settings → Environment Variables
   - Add each variable below:

2. **Add All Environment Variables**

  **Auth / NextAuth:**
  ```
  NEXTAUTH_URL=https://your-project.vercel.app
  NEXTAUTH_SECRET=<generate-random-secret>
  AUTH_BCRYPT_ROUNDS=10
  AUTH_MAX_FAILED_ATTEMPTS=5
  ```

  **Optional Google OAuth (only if you still need Google login):**
  ```
  GOOGLE_CLIENT_ID=<from-google-cloud>
  GOOGLE_CLIENT_SECRET=<from-google-cloud>
  ```

   **Database:**
   ```
   DATABASE_URL=<from-neon-step-1>
   ```

   **Cron Protection:**
   ```
   CRON_SECRET=<generate-random-secret>
   ```

   **OpenAI:**
   ```
   OPENAI_API_KEY=<your-openai-api-key>
   ```

   **Google Service Account:**
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_DRIVE_PARENT_FOLDER_ID=<folder-id-from-google-drive>
   ```

   **Deep Research:**
   ```
   DEEP_RESEARCH_MODEL=o3-deep-research
   DEEP_RESEARCH_TIMEOUT_MS=3600000
   DEEP_RESEARCH_MAX_WAIT_MS=900000
   ```

   **News API (Legacy fallback - optional):**
   ```
   # NEWS_API_KEY=<your-news-api-key>
   ```

3. **Generate Secrets**
   - For `NEXTAUTH_SECRET` and `CRON_SECRET`, generate random strings:
     ```bash
     openssl rand -base64 32
     ```
   - Or use an online generator: https://generate-secret.vercel.app/32

4. **Important Notes:**
   - Set all variables for **Production**, **Preview**, and **Development** environments
   - For `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: Copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Replace `\n` with actual newlines when pasting (Vercel handles this automatically)
   - Update `NEXTAUTH_URL` after first deployment to match your actual Vercel domain

---

## Step 4: Set Up Google OAuth (NextAuth)

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
   - Also enable "Google Identity" if needed

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://your-project.vercel.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - Copy the **Client ID** and **Client Secret**
   - Add these to Vercel env vars as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## Step 5: Set Up Google Service Account (for Docs/Drive)

1. **Create Service Account**
   - In Google Cloud Console → "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: `newsletter-service-account`
   - Click "Create and Continue"
   - Skip role assignment, click "Done"

2. **Create Service Account Key**
   - Click on the created service account
   - Go to "Keys" tab → "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the JSON file
   - **Extract from JSON:**
     - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

3. **Enable APIs**
   - Go to "APIs & Services" → "Library"
   - Enable:
     - **Google Drive API**
     - **Google Docs API**

4. **Set Up Google Drive Folder**
   - Go to [drive.google.com](https://drive.google.com)
   - Create a folder named "Newsletter Drafts" (or your preferred name)
   - Right-click folder → "Share"
   - Add the service account email (from step 2) as **Editor**
   - Get the folder ID from the URL:
     - URL format: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
     - Copy the `FOLDER_ID_HERE` part
   - Add to Vercel as `GOOGLE_DRIVE_PARENT_FOLDER_ID`

---

## Step 6: Deploy and Run Migrations

1. **Deploy to Vercel**
   - In Vercel, click "Deploy" (or push to GitHub to trigger auto-deploy)
   - Wait for deployment to complete
   - Note your deployment URL (e.g., `https://your-project.vercel.app`)

2. **Update NEXTAUTH_URL**
   - Go back to Vercel Environment Variables
   - Update `NEXTAUTH_URL` to your actual Vercel domain
   - Redeploy (or wait for auto-redeploy)

3. **Run Database Migrations**
   - Option A: Using Neon Console (Recommended)
     - Go to Neon dashboard → SQL Editor
     - Run the SQL from `src/db/migrations/` (if generated locally)
     - Or use Drizzle Kit push (see Option B)

   - Option B: Using Drizzle Kit (from local machine)
     ```bash
     cd newsletter-admin
     # Make sure DATABASE_URL is set in .env.local
     npx drizzle-kit push
     ```

   - Option C: Generate and apply migrations
     ```bash
     # Generate migrations
     npx drizzle-kit generate
     # Apply via Neon console or drizzle-kit push
     npx drizzle-kit push
     ```

---

## Step 7: Set Up Vercel Cron Job

1. **Create Cron Configuration**
   - The `vercel.json` file is already created in the project root
   - It configures a daily cron job at 1 PM UTC (`0 13 * * *`)
   - You can adjust the schedule in `vercel.json`:
     - `0 13 * * *` = Daily at 1 PM UTC
     - `0 13 * * 1,3` = Monday & Wednesday at 1 PM UTC
     - `0 9 * * 1` = Every Monday at 9 AM UTC

2. **Vercel Cron Authentication**
   - The route automatically detects Vercel cron jobs (via `user-agent` or `x-vercel-signature` headers)
   - Vercel cron jobs will work automatically - no additional configuration needed
   - For manual testing from external sources, use: `Authorization: Bearer YOUR_CRON_SECRET`
   
   **Manual Testing:**
   ```bash
   curl -X POST https://your-project.vercel.app/api/jobs/run-newsletters \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. **After First Deployment**
   - The `vercel.json` cron will be automatically registered
   - Check Vercel Dashboard → Settings → Cron Jobs to verify it's active
   - The cron job will run automatically according to the schedule
   - Check Vercel function logs to see execution results

---

## Step 8: Test the Deployment

1. **Test Authentication**
   - Visit `https://your-project.vercel.app`
   - You should be redirected to Google sign-in
   - Sign in with an `@iterate.ai` email (or allowlisted email)
   - Should redirect back to the app

2. **Test Customer Creation**
   - Navigate to `/customers`
   - Click "New Customer"
   - Fill in required fields (Name, Industry)
   - Click "Save"
   - Should create customer and redirect to detail page

3. **Test Newsletter Generation**
   - On customer detail page, click "Run Newsletter Now"
   - Wait for generation (may take 30-60 seconds)
   - Should show success toast with Google Doc URL
   - Click the URL to verify document was created in Drive

4. **Verify Database**
   - Check Neon dashboard → SQL Editor
   - Run: `SELECT * FROM customer_config;`
   - Should see your test customer

5. **Test Cron Job (Manual)**
   - Use curl or Postman:
   ```bash
   curl -X POST https://your-project.vercel.app/api/jobs/run-newsletters \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
   - Should return JSON with processed results

---

## Step 9: Seed Initial Data (Optional)

1. **Add Internal Updates**
   - Connect to Neon database
   - Insert sample internal updates:
   ```sql
   INSERT INTO internal_update (title, body, source_url, active)
   VALUES
     ('New Feature Launch', 'We launched feature X', 'https://iterate.ai/blog', true),
     ('Team Update', 'Welcome new team member', NULL, true);
   ```

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct in Vercel
- Check Neon dashboard for connection logs
- Ensure SSL mode is enabled (`?sslmode=require`)

### Authentication Not Working
- Verify `NEXTAUTH_URL` matches your Vercel domain exactly
- Check Google OAuth redirect URIs include your domain
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

### Google Docs Not Creating
- Verify service account email has access to Drive folder
- Check `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` includes full key with newlines
- Ensure Drive API and Docs API are enabled in Google Cloud

### Cron Job Not Running
- Check Vercel Cron Jobs dashboard for execution logs
- Verify `CRON_SECRET` matches in environment variables
- Test manually with curl first

### Newsletter Generation Fails
- Check Vercel function logs (Runtime Logs in dashboard)
- Verify OpenAI and deep research env values are set correctly
- Confirm OpenAI API quota/limits and MCP/web-search entitlements
- (Optional) If falling back to NewsAPI, verify `NEWS_API_KEY` is valid

---

## Quick Reference: Environment Variables Checklist

```
✅ NEXTAUTH_URL
✅ NEXTAUTH_SECRET
✅ AUTH_BCRYPT_ROUNDS
✅ AUTH_MAX_FAILED_ATTEMPTS
✅ GOOGLE_CLIENT_ID
✅ GOOGLE_CLIENT_SECRET
✅ DATABASE_URL
✅ CRON_SECRET
✅ OPENAI_API_KEY
✅ GOOGLE_SERVICE_ACCOUNT_EMAIL
✅ GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
✅ GOOGLE_DRIVE_PARENT_FOLDER_ID
✅ DEEP_RESEARCH_MODEL
✅ DEEP_RESEARCH_TIMEOUT_MS
✅ DEEP_RESEARCH_MAX_WAIT_MS
☑️ NEWS_API_KEY (optional fallback)
```

---

## Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] All environment variables set in Vercel
- [ ] Google OAuth configured and tested
- [ ] Google Service Account set up with Drive access
- [ ] Vercel Cron job configured
- [ ] Authentication flow tested
- [ ] Customer creation tested
- [ ] Newsletter generation tested
- [ ] Google Doc creation verified
- [ ] Cron job tested manually

---

## Support

If you encounter issues:
1. Check Vercel Runtime Logs (Project → Logs)
2. Check Neon database logs
3. Verify all environment variables are set correctly
4. Test API endpoints individually

