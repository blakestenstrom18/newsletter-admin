import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { processPendingRun } from '@/services/newsletter';

export const runtime = 'nodejs';
// Increase max duration to 60s (Pro) or rely on 10s (Hobby) failing fast?
// Gemini is fast, but 10s is tight.
// Ideally, the user should be on Pro.
export const maxDuration = 60;

/**
 * POST /api/jobs/poll-research
 * Worker that picks up ONE pending run and processes it synchronously.
 * Runs every 5 minutes.
 */
export async function POST(req: NextRequest) {
  // Protect with secret header
  const authz = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  const expected = `Bearer ${cronSecret}`;

  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron') ||
    req.headers.get('x-vercel-signature');

  if (!isVercelCron && (!authz || authz !== expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find ONE pending run
  // We prioritize the oldest pending run (FIFO)
  const pendingRuns = await db
    .select()
    .from(newsletterRun)
    .where(eq(newsletterRun.status, 'pending'))
    .orderBy(newsletterRun.startedAt) // FIFO
    .limit(1);

  if (pendingRuns.length === 0) {
    console.info('[poll-research] no pending runs found');
    return NextResponse.json({ ok: true, message: 'No pending runs' });
  }

  const run = pendingRuns[0];

  // Get customer
  const [customer] = await db
    .select()
    .from(customerConfig)
    .where(eq(customerConfig.id, run.customerId));

  if (!customer) {
    console.error(`[poll-research] customer not found for run ${run.id}`);
    await db.update(newsletterRun).set({ status: 'error', errorMessage: 'Customer not found' }).where(eq(newsletterRun.id, run.id));
    return NextResponse.json({ ok: false, error: 'Customer not found' });
  }

  console.info(`[poll-research] picked up run ${run.id} for ${customer.name}`);

  // Process it synchronously
  const result = await processPendingRun({ runId: run.id, customer });

  return NextResponse.json({
    ok: true,
    processed: 1,
    runId: run.id,
    status: result
  });
}
