import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customerConfig, newsletterRun } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { startNewsletterGeneration, markNewsletterFailed } from '@/services/newsletter';

export const runtime = 'nodejs';

/**
 * POST /api/customers/[id]/run
 * Starts newsletter generation for a customer.
 * Returns immediately with status "researching" - does NOT wait for completion.
 * The poll-research cron job will complete the newsletter when research is done.
 */
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch customer
  const [cust] = await db.select().from(customerConfig).where(eq(customerConfig.id, id));
  if (!cust) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Create pending newsletter run
  const [run] = await db.insert(newsletterRun).values({
    customerId: cust.id,
    triggerType: 'manual',
    status: 'pending',
  }).returning();

  try {
    // Start research (returns immediately, does not wait for completion)
    const result = await startNewsletterGeneration({ customer: cust, runId: run.id });
    
    // Return immediately with "researching" status
    return NextResponse.json({
      runId: result.runId,
      responseId: result.responseId,
      status: result.status,
      message: 'Newsletter research started. Check back in 5-30 minutes.',
    }, { status: 202 }); // 202 Accepted - processing started but not complete
    
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await markNewsletterFailed({ runId: run.id, errorMessage: message });
    return NextResponse.json({ 
      error: 'Failed to start research', 
      details: message,
    }, { status: 500 });
  }
}
