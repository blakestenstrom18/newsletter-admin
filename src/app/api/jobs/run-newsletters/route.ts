import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customerConfig, newsletterRun } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isCustomerDue } from '@/lib/scheduler';
import { startNewsletterGeneration, markNewsletterFailed } from '@/services/newsletter';

export const runtime = 'nodejs';

/**
 * POST /api/jobs/run-newsletters
 * Daily cron job that starts newsletter generation for customers that are due.
 * Kicks off deep research but does NOT wait for completion.
 * The poll-research cron job will complete the newsletters when research is done.
 */
export async function POST(req: NextRequest) {
  // Protect with secret header
  const authz = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  const expected = `Bearer ${cronSecret}`;
  
  // Allow Vercel cron (internal) or manual calls with CRON_SECRET
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron') || 
                       req.headers.get('x-vercel-signature');
  
  if (!isVercelCron && (!authz || authz !== expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const customers = await db.select().from(customerConfig).where(eq(customerConfig.active, true));

  const results: Array<{
    customerId: string;
    customerName: string;
    ok: boolean;
    runId?: string;
    responseId?: string;
    error?: string;
  }> = [];

  for (const cust of customers) {
    if (!isCustomerDue(cust, now)) continue;

    // Create pending newsletter run
    const [run] = await db.insert(newsletterRun).values({
      customerId: cust.id,
      triggerType: 'scheduled',
      status: 'pending',
    }).returning();

    try {
      // Start research (returns immediately)
      const result = await startNewsletterGeneration({ customer: cust, runId: run.id });
      
      results.push({ 
        customerId: cust.id, 
        customerName: cust.name,
        ok: true, 
        runId: result.runId,
        responseId: result.responseId,
      });

      console.info(`[run-newsletters] started research for ${cust.name} (runId=${run.id})`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await markNewsletterFailed({ runId: run.id, errorMessage: message });
      
      results.push({ 
        customerId: cust.id, 
        customerName: cust.name,
        ok: false, 
        error: message,
      });

      console.error(`[run-newsletters] failed to start research for ${cust.name}:`, message);
    }
  }

  const started = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.info(`[run-newsletters] done: ${started} started, ${failed} failed`);

  return NextResponse.json({ 
    ok: true, 
    processed: results.length,
    started,
    failed,
    results,
    message: started > 0 
      ? `Started ${started} newsletter(s). They will complete in 5-30 minutes.`
      : 'No newsletters due today.',
  });
}
