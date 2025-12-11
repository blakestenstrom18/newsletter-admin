import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { pollAndCompleteIfReady, markNewsletterFailed } from '@/services/newsletter';

export const runtime = 'nodejs';

/**
 * POST /api/jobs/poll-research
 * Cron job that polls for completed deep research jobs and finishes newsletter generation.
 * Runs every 5 minutes via Vercel cron.
 */
export async function POST(req: NextRequest) {
  // Protect with secret header (same as run-newsletters)
  const authz = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  const expected = `Bearer ${cronSecret}`;
  
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron') || 
                       req.headers.get('x-vercel-signature');
  
  if (!isVercelCron && (!authz || authz !== expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all newsletter runs that are in "researching" status
  const researchingRuns = await db
    .select()
    .from(newsletterRun)
    .where(eq(newsletterRun.status, 'researching'));

  console.info(`[poll-research] found ${researchingRuns.length} runs in researching status`);

  const results: Array<{
    runId: string;
    customerId: string;
    previousStatus: string;
    newStatus: string;
    error?: string;
  }> = [];

  for (const run of researchingRuns) {
    // Skip if no responseId (shouldn't happen, but be defensive)
    if (!run.researchResponseId) {
      console.warn(`[poll-research] run ${run.id} has no researchResponseId, marking as error`);
      await markNewsletterFailed({ 
        runId: run.id, 
        errorMessage: 'Missing research response ID' 
      });
      results.push({
        runId: run.id,
        customerId: run.customerId,
        previousStatus: 'researching',
        newStatus: 'error',
        error: 'Missing research response ID',
      });
      continue;
    }

    // Get customer for this run
    const [customer] = await db
      .select()
      .from(customerConfig)
      .where(eq(customerConfig.id, run.customerId));

    if (!customer) {
      console.warn(`[poll-research] run ${run.id} has no customer, marking as error`);
      await markNewsletterFailed({ 
        runId: run.id, 
        errorMessage: 'Customer not found' 
      });
      results.push({
        runId: run.id,
        customerId: run.customerId,
        previousStatus: 'researching',
        newStatus: 'error',
        error: 'Customer not found',
      });
      continue;
    }

    try {
      // Check status and complete if ready
      const newStatus = await pollAndCompleteIfReady({
        runId: run.id,
        responseId: run.researchResponseId,
        customer,
      });

      results.push({
        runId: run.id,
        customerId: run.customerId,
        previousStatus: 'researching',
        newStatus,
      });

      console.info(`[poll-research] run ${run.id} for ${customer.name}: ${newStatus}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[poll-research] error processing run ${run.id}:`, message);
      
      await markNewsletterFailed({ runId: run.id, errorMessage: message });
      results.push({
        runId: run.id,
        customerId: run.customerId,
        previousStatus: 'researching',
        newStatus: 'error',
        error: message,
      });
    }
  }

  // Summary
  const completed = results.filter(r => r.newStatus === 'success').length;
  const stillResearching = results.filter(r => r.newStatus === 'researching').length;
  const errored = results.filter(r => r.newStatus === 'error').length;

  console.info(`[poll-research] done: ${completed} completed, ${stillResearching} still researching, ${errored} errored`);

  return NextResponse.json({
    ok: true,
    processed: results.length,
    completed,
    stillResearching,
    errored,
    results,
  });
}

