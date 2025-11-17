import { db } from '@/db';
import { internalUpdate } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function fetchIterateUpdates(limit = 6) {
  const rows = await db.select().from(internalUpdate).where(eq(internalUpdate.active, true)).orderBy(desc(internalUpdate.createdAt)).limit(limit);
  return rows.map((r) => ({ update: r.title + (r.body ? ` — ${r.body}` : ''), sourceUrl: r.sourceUrl || undefined }));
}

