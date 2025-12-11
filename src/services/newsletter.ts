import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { startResearch, checkResearchStatus, type DeepResearchPayload } from './deepResearch';
import { fetchIterateUpdates } from './iterate';
import { synthesizeNewsletter } from './llm';
import { createNewsletterDoc } from './google';
import { normalizeResearchPayload, type NewsArticle } from './news';

type CustomerRecord = typeof customerConfig.$inferSelect;

/**
 * Starts newsletter generation by kicking off deep research.
 * Returns immediately with status "researching" - does NOT wait for completion.
 * Use completeNewsletterGeneration() when research is done.
 */
export async function startNewsletterGeneration(opts: { 
  customer: CustomerRecord; 
  runId: string 
}): Promise<{ runId: string; responseId: string; status: 'researching' }> {
  const { customer, runId } = opts;

  // Start deep research (returns immediately)
  const responseId = await startResearch(customer);

  // Update run status to "researching" with the responseId
  await db.update(newsletterRun).set({
    status: 'researching',
    researchResponseId: responseId,
  }).where(eq(newsletterRun.id, runId));

  console.info(`[newsletter] started research for ${customer.name} (runId=${runId}, responseId=${responseId})`);

  return { runId, responseId, status: 'researching' };
}

/**
 * Completes newsletter generation after deep research is done.
 * Call this with the research payload once checkResearchStatus returns "completed".
 */
export async function completeNewsletterGeneration(opts: {
  customer: CustomerRecord;
  runId: string;
  responseId: string;
  payload: DeepResearchPayload;
  rawText: string;
}): Promise<{ 
  runId: string; 
  content: ReturnType<typeof synthesizeNewsletter> extends Promise<infer T> ? T : never;
  googleDocId?: string; 
  googleDocUrl?: string;
}> {
  const { customer, runId, responseId, payload, rawText } = opts;

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
    researchResponseId: string;
    researchPayload: { structured: DeepResearchPayload; rawText: string };
    googleDocId?: string;
    googleDocUrl?: string;
  } = {
    status: 'success',
    content,
    finishedAt: new Date(),
    researchResponseId: responseId,
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

  return { 
    runId, 
    content,
    googleDocId: updateData.googleDocId, 
    googleDocUrl: updateData.googleDocUrl,
  };
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

/**
 * Gets a newsletter run by ID with its customer data.
 */
export async function getNewsletterRunWithCustomer(runId: string) {
  const [run] = await db
    .select()
    .from(newsletterRun)
    .where(eq(newsletterRun.id, runId));
  
  if (!run) return null;

  const [customer] = await db
    .select()
    .from(customerConfig)
    .where(eq(customerConfig.id, run.customerId));

  return { run, customer };
}

/**
 * Checks if a researching newsletter run is complete and finishes it if so.
 * Returns the updated status.
 */
export async function pollAndCompleteIfReady(opts: {
  runId: string;
  responseId: string;
  customer: CustomerRecord;
}): Promise<'researching' | 'success' | 'error'> {
  const { runId, responseId, customer } = opts;

  const status = await checkResearchStatus(responseId);

  if (status.status === 'in_progress' || status.status === 'pending') {
    return 'researching';
  }

  if (status.status === 'completed') {
    await completeNewsletterGeneration({
      customer,
      runId,
      responseId,
      payload: status.payload,
      rawText: status.rawText,
    });
    return 'success';
  }

  // Failed, cancelled, or expired
  const errorMessage = status.status === 'failed' 
    ? status.error 
    : `Research ${status.status}`;
  
  await markNewsletterFailed({ runId, errorMessage });
  return 'error';
}

/**
 * @deprecated Use startNewsletterGeneration() + completeNewsletterGeneration() for async workflow.
 * This synchronous version will timeout on Vercel.
 */
export async function generateAndPersistNewsletter(opts: { customer: CustomerRecord; runId: string }) {
  const { customer, runId } = opts;

  // Start research
  const { responseId } = await startNewsletterGeneration({ customer, runId });

  // Poll until complete (will timeout on Vercel!)
  const startedAt = Date.now();
  const maxWaitMs = 30 * 60 * 1000; // 30 minutes

  while (true) {
    if (Date.now() - startedAt > maxWaitMs) {
      await markNewsletterFailed({ runId, errorMessage: 'Research timed out' });
      throw new Error('Research timed out');
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    const result = await pollAndCompleteIfReady({ runId, responseId, customer });
    
    if (result === 'success') {
      const data = await getNewsletterRunWithCustomer(runId);
      return {
        runId,
        content: data?.run.content,
        googleDocId: data?.run.googleDocId,
        googleDocUrl: data?.run.googleDocUrl,
      };
    }

    if (result === 'error') {
      throw new Error('Newsletter generation failed');
    }
  }
}
