import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customerConfig, newsletterRun } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { isCustomerDue } from '@/lib/scheduler';
import { generateAndPersistNewsletter } from '@/services/newsletter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Protect with secret header
  // Check for Authorization header with CRON_SECRET
  const authz = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  const expected = `Bearer ${cronSecret}`;
  
  // Allow Vercel cron (internal) or manual calls with CRON_SECRET
  // Vercel cron jobs are internal requests, but we still want to protect from external calls
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron') || 
                       req.headers.get('x-vercel-signature');
  
  if (!isVercelCron && (!authz || authz !== expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const customers = await db.select().from(customerConfig).where(eq(customerConfig.active, true));

  const results: any[] = [];
  for (const cust of customers) {
    if (!isCustomerDue(cust, now)) continue;

    const [run] = await db.insert(newsletterRun).values({
      customerId: cust.id,
      triggerType: 'scheduled',
      status: 'pending',
    }).returning();

    try {
      const res = await generateAndPersistNewsletter({ customer: cust, runId: run.id });
      results.push({ id: cust.id, ok: true, docUrl: res.googleDocUrl });
    } catch (err: any) {
      await db.update(newsletterRun).set({
        status: 'error',
        errorMessage: err?.message ?? String(err),
      }).where(eq(newsletterRun.id, run.id));
      results.push({ id: cust.id, ok: false, error: err?.message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

