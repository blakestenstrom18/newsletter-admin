import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchResearchBundle } from './news';
import { fetchIterateUpdates } from './iterate';
import { synthesizeNewsletter } from './llm';
import { createNewsletterDoc } from './google';

export async function generateAndPersistNewsletter(opts: { customer: any; runId: string }) {
  const { customer, runId } = opts;
  const [newsBundle, iter] = await Promise.all([
    fetchResearchBundle(customer),
    fetchIterateUpdates(6),
  ]);

  const content = await synthesizeNewsletter({
    customer,
    customerNews: newsBundle.customerNews,
    competitorNews: newsBundle.competitorNews,
    industryTrends: newsBundle.industryTrends,
    iterateUpdates: iter,
  });

  // Store content in database (always)
  const updateData: any = {
    status: 'success',
    content: content,
    finishedAt: new Date(),
  };
  if (newsBundle.responseId) {
    updateData.researchResponseId = newsBundle.responseId;
    updateData.researchPayload = {
      structured: newsBundle.payload,
      rawText: newsBundle.rawText,
    };
  }

  // Optionally create Google Doc if credentials are available
  try {
    const { documentId, url } = await createNewsletterDoc({
      customerName: customer.name,
      content,
    });
    updateData.googleDocId = documentId;
    updateData.googleDocUrl = url;
  } catch (error: any) {
    // Google Drive is optional - log but don't fail
    console.warn('Google Drive creation failed (optional):', error?.message || error);
  }

  await db.update(newsletterRun).set(updateData).where(eq(newsletterRun.id, runId));

  await db.update(customerConfig).set({
    lastRunAt: new Date(),
  }).where(eq(customerConfig.id, customer.id));

  return { 
    runId, 
    content,
    googleDocId: updateData.googleDocId, 
    googleDocUrl: updateData.googleDocUrl 
  };
}

