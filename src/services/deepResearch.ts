import { GoogleGenerativeAI } from '@google/generative-ai';
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
  payload: DeepResearchPayload;
  rawText: string;
};

let cachedClient: GoogleGenerativeAI | null = null;

function getClient() {
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  }
  return cachedClient;
}

/**
 * Performs synchronous deep research using Google Gemini 2.0 Flash.
 * This function waits for the research to complete and returns the parsed payload.
 */
export async function performGeminiResearch(customer: CustomerRecord): Promise<DeepResearchResult> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: env.DEEP_RESEARCH_MODEL,
    tools: [{ googleSearch: {} }] as any
  });

  const prompt = buildPrompt(customer);

  console.info(`[deep-research] starting gemini research for ${customer.name}`);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.info(`[deep-research] completed gemini research for ${customer.name} (length=${text.length})`);

    const cleaned = stripCodeFences(text);
    const payload = safeParseJson(cleaned);

    if (
      !payload ||
      typeof payload !== 'object' ||
      !Array.isArray(payload.customerNews) ||
      !Array.isArray(payload.competitorNews) ||
      !Array.isArray(payload.industryTrends)
    ) {
      throw new Error('Gemini response missing required sections (customerNews, competitorNews, industryTrends)');
    }

    return {
      payload: payload as DeepResearchPayload,
      rawText: text,
    };

  } catch (error: any) {
    console.error(`[deep-research] gemini research failed for ${customer.name}:`, error);
    throw new Error(`Gemini research failed: ${error.message || String(error)}`);
  }
}

function stripCodeFences(text: string) {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[\w-]*\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned.trim();
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    // Try to find JSON object if mixed with text
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (e) {
        // failed inner parse
      }
    }
    throw new Error('Failed to parse JSON from Gemini output');
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
Use Google Search to find real-time information.

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
