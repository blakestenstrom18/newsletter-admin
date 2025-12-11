import type { DeepResearchPayload } from './deepResearch';

export type NewsArticle = { title: string; url: string; description?: string; source?: string };

export type NormalizedResearch = {
  customerNews: NewsArticle[];
  competitorNews: NewsArticle[];
  industryTrends: NewsArticle[];
};

/**
 * Normalizes a deep research payload into NewsArticle arrays.
 * Handles deduplication and URL validation.
 */
export function normalizeResearchPayload(payload: DeepResearchPayload): NormalizedResearch {
  return {
    customerNews: normalizeSection(payload.customerNews, 15),
    competitorNews: normalizeSection(payload.competitorNews, 10),
    industryTrends: normalizeSection(payload.industryTrends, 15),
  };
}

function normalizeSection(
  items: Array<{ title?: string; url?: string; summary?: string; source?: string }> = [], 
  limit: number
): NewsArticle[] {
  const dedup = new Map<string, NewsArticle>();
  for (const item of items) {
    if (!item) continue;
    const url = normalizeUrl(item.url);
    const title = (item.title || '').trim();
    if (!url || !title) continue;
    const key = url.toLowerCase();
    if (dedup.has(key)) continue;
    dedup.set(key, {
      title,
      url,
      description: item.summary?.trim(),
      source: item.source?.trim() || deriveSourceFromUrl(url),
    });
  }
  return Array.from(dedup.values()).slice(0, limit);
}

function normalizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function deriveSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return 'source';
  }
}
