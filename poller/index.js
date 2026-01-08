/**
 * Newsletter Research Poller
 * Runs on Render free tier as a background worker.
 * Polls the Vercel API every 5 minutes to complete newsletters.
 */

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function poll() {
  const vercelUrl = process.env.VERCEL_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!vercelUrl || !cronSecret) {
    console.error('[poller] Missing VERCEL_URL or CRON_SECRET environment variables');
    return;
  }

  const endpoint = `${vercelUrl}/api/jobs/poll-research`;

  try {
    console.log(`[poller] Polling ${endpoint}...`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[poller] HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`[poller] Success:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[poller] Error:`, err.message);
  }
}

async function main() {
  console.log('[poller] Starting newsletter research poller...');
  console.log(`[poller] Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`[poller] Target: ${process.env.VERCEL_URL || '(not set)'}`);

  // Poll immediately on startup
  await poll();

  // Then poll every 5 minutes
  setInterval(poll, POLL_INTERVAL_MS);
}

main();
