# Newsletter Poller for Render

A lightweight background worker that polls for completed newsletter research.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VERCEL_URL` | Your Vercel app URL (e.g., `https://your-app.vercel.app`) |
| `CRON_SECRET` | A secure random string used to authorize requests. |

## How to create CRON_SECRET

Run this command in your terminal:
```bash
openssl rand -base64 32
```
Copy the output and use it as the value for `CRON_SECRET` on both Vercel and Render.

## Render Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Background Worker**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `newsletter-poller`
   - **Root Directory**: `newsletter-admin/poller`
   - **Build Command**: `npm install` (or leave blank, no deps needed)
   - **Start Command**: `npm start`
5. Add environment variables (`VERCEL_URL`, `CRON_SECRET`)
6. Deploy

The worker will poll every 5 minutes to complete newsletters.
