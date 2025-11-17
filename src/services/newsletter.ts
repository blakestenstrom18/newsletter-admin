import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchCustomerNews, fetchCompetitorNews, fetchIndustryTrends } from './news';
import { fetchIterateUpdates } from './iterate';
import { synthesizeNewsletter } from './llm';
import { createNewsletterDoc } from './google';

export async function generateAndPersistNewsletter(opts: { customer: any; runId: string }) {
  const { customer, runId } = opts;
  const [custNews, compNews, industry, iter] = await Promise.all([
    fetchCustomerNews(customer),
    fetchCompetitorNews(customer.competitors ?? []),
    fetchIndustryTrends(customer.industry, customer.subVerticals ?? []),
    fetchIterateUpdates(6),
  ]);

  const content = await synthesizeNewsletter({
    customer,
    customerNews: custNews,
    competitorNews: compNews,
    industryTrends: industry,
    iterateUpdates: iter,
  });

  // Store content in database (always)
  const updateData: any = {
    status: 'success',
    content: content,
    finishedAt: new Date(),
  };

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

