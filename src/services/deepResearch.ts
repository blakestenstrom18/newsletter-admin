import OpenAI from 'openai';
import type { customerConfig } from '@/db/schema';
import { env } from '@/lib/env';

type CustomerRecord = typeof customerConfig.$inferSelect;

type DeepResearchFinding = {
  title?: string;
  summary?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
};

export type DeepResearchPayload = {
  customerNews: DeepResearchFinding[];
  competitorNews: DeepResearchFinding[];
  industryTrends: DeepResearchFinding[];
};

export type DeepResearchResult = {
  responseId: string;
  payload: DeepResearchPayload;
  rawText: string;
};

export type ResearchStatusResult =
  | { status: 'pending' }
  | { status: 'in_progress' }
  | { status: 'completed'; payload: DeepResearchPayload; rawText: string }
  | { status: 'failed'; error: string }
  | { status: 'cancelled' }
  | { status: 'expired' };

let cachedClient: OpenAI | null = null;

function getClient() {
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 30_000, // 30s timeout for individual API calls
    });
  }
  return cachedClient;
}

/**
 * Kicks off a deep research job and returns immediately with the responseId.
 * Does NOT wait for completion - use checkResearchStatus() to poll.
 */
export async function startResearch(customer: CustomerRecord): Promise<string> {
  const client = getClient();
  const prompt = buildPrompt(customer);

  const createResp = await client.responses.create({
    model: env.DEEP_RESEARCH_MODEL,
    input: [{ role: 'user', content: prompt }],
    background: true,
    tools: [{ type: 'web_search_preview' }],
    max_output_tokens: 50000, // Important for o-series/deep research
  } as any);

  console.info(`[deep-research] queued ${customer.name} (responseId=${createResp.id})`);

  return createResp.id;
}

/**
 * Checks the status of a deep research job once.
 * Returns the current status and payload if completed.
 */
export async function checkResearchStatus(responseId: string): Promise<ResearchStatusResult> {
  const client = getClient();

  const resp = await client.responses.retrieve(responseId);
  const status = resp.status;

  console.info(`[deep-research] status check for ${responseId}: ${status}`);

  if (!status || status === 'queued' || status === 'in_progress') {
    return { status: 'in_progress' };
  }

  if (status === 'completed') {
    try {
      const { payload, rawText } = extractPayload(resp);
      return { status: 'completed', payload, rawText };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'failed', error: `Payload extraction failed: ${message}` };
    }
  }

  if (status === 'failed' || status === 'incomplete') {
    const errMessage = (resp as { last_error?: { message?: string } }).last_error?.message ?? 'Unknown error';
    return { status: 'failed', error: errMessage };
  }

  if (status === 'cancelled') {
    return { status: 'cancelled' };
  }

  // Handle any other terminal status
  return { status: 'failed', error: `Unexpected status: ${status}` };
}

/**
 * Fetches full response details from OpenAI API.
 * Used to get error details when a response fails.
 */
export async function fetchResponseDetails(responseId: string): Promise<{
  status?: string;
  error?: string;
  lastError?: { message?: string; code?: string };
  rawResponse?: any;
}> {
  const client = getClient();
  const resp = await client.responses.retrieve(responseId);

  console.info(`[deep-research] full retrieved response for ${responseId}:`, JSON.stringify(resp, null, 2));

  const lastError = (resp as any).last_error;

  return {
    status: resp.status,
    error: lastError?.message,
    lastError,
    rawResponse: resp,
  };
}

/**
 * Legacy function for backward compatibility - runs synchronously with polling.
 * WARNING: This will timeout on Vercel. Use startResearch() + checkResearchStatus() instead.
 * @deprecated Use startResearch() and checkResearchStatus() for async workflow
 */
export async function runNewsResearch(customer: CustomerRecord): Promise<DeepResearchResult> {
  const responseId = await startResearch(customer);
  const startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt > env.DEEP_RESEARCH_MAX_WAIT_MS) {
      throw new Error(`Deep research ${responseId} timed out after ${env.DEEP_RESEARCH_MAX_WAIT_MS}ms`);
    }

    await delay(5000); // Wait 5 seconds between polls

    const result = await checkResearchStatus(responseId);

    if (result.status === 'completed') {
      console.info(`[deep-research] completed ${customer.name} (responseId=${responseId}, durationMs=${Date.now() - startedAt})`);
      return {
        responseId,
        payload: result.payload,
        rawText: result.rawText,
      };
    }

    if (result.status === 'failed') {
      throw new Error(`Deep research ${responseId} failed: ${result.error}`);
    }

    if (result.status === 'cancelled' || result.status === 'expired') {
      throw new Error(`Deep research ${responseId} was ${result.status}`);
    }

    // Still in progress, continue polling
  }
}

/**
 * Extracts payload from a webhook callback body.
 * Used by the /api/webhooks/openai endpoint.
 */
export function extractPayloadFromWebhook(response: {
  output?: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
  }>;
}): { payload: DeepResearchPayload; rawText: string } {
  return extractPayload(response);
}

function extractPayload(response: { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }): { payload: DeepResearchPayload; rawText: string } {
  const textChunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const piece of item.content ?? []) {
      if (piece.type === 'output_text' && typeof piece.text === 'string') {
        textChunks.push(piece.text);
      }
    }
  }

  const joined = textChunks.join('\n').trim();
  if (!joined) {
    throw new Error('Deep research response did not include output_text content');
  }

  const cleaned = stripCodeFences(joined);
  const parsed = safeParseJson(cleaned);

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(parsed.customerNews) ||
    !Array.isArray(parsed.competitorNews) ||
    !Array.isArray(parsed.industryTrends)
  ) {
    throw new Error('Deep research payload missing required sections');
  }

  return {
    payload: parsed as DeepResearchPayload,
    rawText: joined,
  };
}

function stripCodeFences(text: string) {
  if (text.startsWith('```')) {
    return text.replace(/```[\w-]*\n?/g, '').trim();
  }
  return text;
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('Failed to parse JSON from deep research output');
  }
}

function buildPrompt(customer: CustomerRecord) {
  const keywords = customer.newsKeywords?.length ? customer.newsKeywords.join(', ') : customer.name;
  const competitors = (customer.competitors ?? []).slice(0, 5).join(', ') || 'Peer set in same industry';
  const priorities = (customer.keyPriorities ?? []).join('; ') || 'Not specified';
  const subVerticals = (customer.subVerticals ?? []).join(', ') || customer.industry;
  const initiatives = customer.currentInitiatives ?? 'Not specified';

  return `
You are a senior research analyst supporting executive briefings for enterprise accounts.
Research must come from reputable sources published within the last 45 days.

Company: ${customer.name}
Industry: ${customer.industry}
Sub-verticals / focus areas: ${subVerticals}
Key priorities: ${priorities}
Strategic initiatives: ${initiatives}
Preferred keywords: ${keywords}
Competitors to cover: ${competitors}

Return ONLY valid JSON with this shape:
{
  "customerNews": [{"title": "", "summary": "", "url": "", "source": "", "publishedAt": ""}],
  "competitorNews": [{"title": "", "summary": "", "url": "", "source": "", "publishedAt": ""}],
  "industryTrends": [{"title": "", "summary": "", "url": "", "source": "", "publishedAt": ""}]
}

Expectations:
- customerNews: 5-10 items relevant to ${customer.name}, product launches, leadership moves, strategy.
- competitorNews: 3-6 items highlighting noteworthy competitor actions or signals affecting ${customer.name}.
- industryTrends: 3-6 items summarizing category shifts, regulations, investments, or technology trends.
- Use concise summaries with clear implications.
- Provide the canonical article URL and publisher name in \`source\`.
- Avoid duplicate URLs across arrays and cite the most authoritative source available.
`.trim();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
