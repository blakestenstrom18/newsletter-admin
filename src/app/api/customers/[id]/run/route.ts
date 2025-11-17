import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customerConfig, newsletterRun } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateAndPersistNewsletter } from '@/services/newsletter';

export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cust] = await db.select().from(customerConfig).where(eq(customerConfig.id, id));
  if (!cust) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const [run] = await db.insert(newsletterRun).values({
    customerId: cust.id,
    triggerType: 'manual',
    status: 'pending',
  }).returning();

  try {
    const result = await generateAndPersistNewsletter({ customer: cust, runId: run.id });
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    await db.update(newsletterRun).set({
      status: 'error',
      errorMessage: err?.message ?? String(err),
    }).where(eq(newsletterRun.id, run.id));
    return NextResponse.json({ error: 'Generation failed', details: err?.message }, { status: 500 });
  }
}

