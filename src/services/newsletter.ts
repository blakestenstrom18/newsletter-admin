import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { performGeminiResearch, type DeepResearchPayload } from './deepResearch';
import { fetchIterateUpdates } from './iterate';
import { synthesizeNewsletter } from './llm';
import { createNewsletterDoc } from './google';
import { normalizeResearchPayload } from './news';

type CustomerRecord = typeof customerConfig.$inferSelect;

/**
 * Queues a newsletter generation run.
 * Sets status to 'pending' so the worker can pick it up.
 */
export async function startNewsletterGeneration(opts: {
  customer: CustomerRecord;
  runId: string
}): Promise<{ runId: string; status: 'pending' }> {
  const { runId } = opts;

  // We simply leave it as pending. 
  // The worker (poll-research API) will pick up 'pending' runs and process them.
  console.info(`[newsletter] queued run for ${opts.customer.name} (runId=${runId})`);

  return { runId, status: 'pending' };
}

/**
 * Processes a single pending run synchronously.
 * 1. Runs Gemini Deep Research
 * 2. Synthesizes Newsletter
 * 3. Saves to DB and Google Doc
 */
export async function processPendingRun(opts: {
  runId: string;
  customer: CustomerRecord;
}): Promise<'success' | 'error'> {
  const { runId, customer } = opts;

  console.info(`[newsletter] processing run ${runId} for ${customer.name}`);

  try {
    // 1. Run Research
    await db.update(newsletterRun).set({ status: 'researching', startedAt: new Date() }).where(eq(newsletterRun.id, runId));

    // This is synchronous now (Gemini)
    const researchResult = await performGeminiResearch(customer);

    // 2. Complete Generation
    await completeNewsletterGeneration({
      customer,
      runId,
      payload: researchResult.payload,
      rawText: researchResult.rawText,
    });

    return 'success';

  } catch (error: any) {
    const message = error.message || String(error);
    await markNewsletterFailed({ runId, errorMessage: message });
    return 'error';
  }
}

/**
 * Completes newsletter generation after research is done.
 */
async function completeNewsletterGeneration(opts: {
  customer: CustomerRecord;
  runId: string;
  payload: DeepResearchPayload;
  rawText: string;
}): Promise<void> {
  const { customer, runId, payload, rawText } = opts;

  // Normalize the research payload into NewsArticle arrays
  const normalized = normalizeResearchPayload(payload);

  // Fetch iterate updates in parallel (fast)
  const iterateUpdates = await fetchIterateUpdates(6);

  // Synthesize the newsletter content using LLM
  const content = await synthesizeNewsletter({
    customer,
    customerNews: normalized.customerNews,
    competitorNews: normalized.competitorNews,
    industryTrends: normalized.industryTrends,
    iterateUpdates,
  });

  // Prepare update data
  const updateData: {
    status: string;
    content: typeof content;
    finishedAt: Date;
    researchPayload: { structured: DeepResearchPayload; rawText: string };
    googleDocId?: string;
    googleDocUrl?: string;
  } = {
    status: 'success',
    content,
    finishedAt: new Date(),
    researchPayload: {
      structured: payload,
      rawText,
    },
  };

  // Optionally create Google Doc if credentials are available
  try {
    const { documentId, url } = await createNewsletterDoc({
      customerName: customer.name,
      content,
    });
    updateData.googleDocId = documentId;
    updateData.googleDocUrl = url;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Google Drive creation failed (optional):', message);
  }

  // Save to database
  await db.update(newsletterRun).set(updateData).where(eq(newsletterRun.id, runId));

  // Update customer's lastRunAt
  await db.update(customerConfig).set({
    lastRunAt: new Date(),
  }).where(eq(customerConfig.id, customer.id));

  console.info(`[newsletter] completed ${customer.name} (runId=${runId})`);
}

/**
 * Marks a newsletter run as failed.
 */
export async function markNewsletterFailed(opts: {
  runId: string;
  errorMessage: string;
}): Promise<void> {
  const { runId, errorMessage } = opts;

  await db.update(newsletterRun).set({
    status: 'error',
    errorMessage,
    finishedAt: new Date(),
  }).where(eq(newsletterRun.id, runId));

  console.warn(`[newsletter] failed (runId=${runId}): ${errorMessage}`);
}
