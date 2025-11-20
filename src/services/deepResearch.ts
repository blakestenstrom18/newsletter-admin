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

const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'expired']);
let cachedClient: OpenAI | null = null;

function getClient() {
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: env.DEEP_RESEARCH_TIMEOUT_MS,
    });
  }
  return cachedClient;
}

export async function runNewsResearch(customer: CustomerRecord): Promise<DeepResearchResult> {
  const client = getClient();
  const prompt = buildPrompt(customer);
  const startedAt = Date.now();

  const createResp = await client.responses.create({
    model: env.DEEP_RESEARCH_MODEL,
    input: prompt,
    background: true,
    tools: [{ type: 'web_search_preview' }],
  });

  console.info(`[deep-research] queued ${customer.name} (responseId=${createResp.id})`);

  const finalResp = await pollForCompletion(client, createResp.id);
  const { payload, rawText } = extractPayload(finalResp);
  const durationMs = Date.now() - startedAt;

  console.info(`[deep-research] completed ${customer.name} (responseId=${finalResp.id}, durationMs=${durationMs})`);

  return {
    responseId: finalResp.id,
    payload,
    rawText,
  };
}

async function pollForCompletion(client: OpenAI, responseId: string) {
  const start = Date.now();
  let attempt = 0;

  while (true) {
    if (Date.now() - start > env.DEEP_RESEARCH_MAX_WAIT_MS) {
      throw new Error(`Deep research ${responseId} timed out after ${env.DEEP_RESEARCH_MAX_WAIT_MS}ms`);
    }

    if (attempt > 0) {
      const waitMs = Math.min(2000 * attempt, 15_000);
      await delay(waitMs);
    }
    attempt += 1;

    const resp = await client.responses.retrieve(responseId);
    if (!resp.status || !terminalStatuses.has(resp.status)) {
      continue;
    }

    if (resp.status === 'completed') {
      return resp;
    }

    const errMessage = (resp as { last_error?: { message?: string } }).last_error?.message ?? resp.status;
    throw new Error(`Deep research ${responseId} failed: ${errMessage}`);
  }
}

function extractPayload(response: any): { payload: DeepResearchPayload; rawText: string } {
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

