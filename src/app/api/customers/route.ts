import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customerConfig } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

const createSchema = z.object({
  name: z.string().min(2),
  industry: z.string().min(2),
  active: z.boolean().optional().default(true),
  frequency: z.enum(['weekly','biweekly','monthly']).default('biweekly'),
  timezone: z.string().default('America/Denver'),
  tone: z.enum(['formal','consultative','friendly_exec','concise']).default('friendly_exec'),
  maxItemsPerSection: z.number().int().min(1).max(10).default(4),
  prUrls: z.array(z.string().url()).optional().default([]),
  newsKeywords: z.array(z.string()).optional().default([]),
  competitors: z.array(z.string()).optional().default([]),
  accountOwnerName: z.string().optional(),
  accountOwnerEmail: z.string().email().optional(),
  keyPriorities: z.array(z.string()).optional().default([]),
  currentInitiatives: z.string().optional(),
  internalDocUrl: z.string().url().optional(),
});

export async function GET() {
  const rows = await db.query.customerConfig.findMany({
    orderBy: (c, { asc }) => [asc(c.name)],
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = createSchema.parse(body);

  const [row] = await db.insert(customerConfig).values({
    name: data.name,
    industry: data.industry,
    active: data.active,
    frequency: data.frequency,
    timezone: data.timezone,
    tone: data.tone,
    maxItemsPerSection: data.maxItemsPerSection,
    prUrls: data.prUrls,
    newsKeywords: data.newsKeywords.length ? data.newsKeywords : [data.name],
    competitors: data.competitors,
    accountOwnerName: data.accountOwnerName,
    accountOwnerEmail: data.accountOwnerEmail,
    keyPriorities: data.keyPriorities,
    currentInitiatives: data.currentInitiatives,
    internalDocUrl: data.internalDocUrl,
  }).returning();

  return NextResponse.json(row, { status: 201 });
}

