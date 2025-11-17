import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterRun } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const runs = await db
    .select()
    .from(newsletterRun)
    .where(eq(newsletterRun.customerId, id))
    .orderBy(desc(newsletterRun.startedAt));
  
  return NextResponse.json(runs);
}

