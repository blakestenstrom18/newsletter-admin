import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const [row] = await db.select().from(customerConfig).where(eq(customerConfig.id, params.id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  // include other editable fields; here a subset for brevity:
  active: z.boolean().optional(),
  frequency: z.enum(['weekly','biweekly','monthly']).optional(),
  timezone: z.string().optional(),
  tone: z.enum(['formal','consultative','friendly_exec','concise']).optional(),
  maxItemsPerSection: z.number().int().min(1).max(10).optional(),
  prUrls: z.array(z.string()).optional(),
  newsKeywords: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  keyPriorities: z.array(z.string()).optional(),
  currentInitiatives: z.string().optional(),
  internalDocUrl: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = updateSchema.parse(await req.json());
  const [row] = await db.update(customerConfig).set(patch).where(eq(customerConfig.id, params.id)).returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await db.delete(customerConfig).where(eq(customerConfig.id, params.id));
  return NextResponse.json({ ok: true });
}

