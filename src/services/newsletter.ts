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

  const { documentId, url } = await createNewsletterDoc({
    customerName: customer.name,
    content,
  });

  await db.update(newsletterRun).set({
    status: 'success',
    googleDocId: documentId,
    googleDocUrl: url,
    finishedAt: new Date(),
  }).where(eq(newsletterRun.id, runId));

  await db.update(customerConfig).set({
    lastRunAt: new Date(),
  }).where(eq(customerConfig.id, customer.id));

  return { runId, googleDocId: documentId, googleDocUrl: url };
}

