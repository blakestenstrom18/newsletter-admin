import type { customerConfig } from '@/db/schema';
import { runNewsResearch, type DeepResearchPayload } from './deepResearch';

export type NewsArticle = { title: string; url: string; description?: string; source?: string };

type CustomerRecord = typeof customerConfig.$inferSelect;

export type NewsResearchBundle = {
  customerNews: NewsArticle[];
  competitorNews: NewsArticle[];
  industryTrends: NewsArticle[];
  responseId: string;
  payload: DeepResearchPayload;
  rawText: string;
};

const researchCache = new WeakMap<object, Promise<NewsResearchBundle>>();

export async function fetchCustomerNews(customer: CustomerRecord) {
  return (await getResearchBundle(customer)).customerNews;
}

export async function fetchCompetitorNews(customer: CustomerRecord) {
  return (await getResearchBundle(customer)).competitorNews;
}

export async function fetchIndustryTrends(customer: CustomerRecord) {
  return (await getResearchBundle(customer)).industryTrends;
}

export async function fetchResearchBundle(customer: CustomerRecord) {
  return getResearchBundle(customer);
}

async function getResearchBundle(customer: CustomerRecord): Promise<NewsResearchBundle> {
  const key = customer as unknown as object;
  let existing = researchCache.get(key);
  if (!existing) {
    existing = runAndNormalize(customer);
    researchCache.set(key, existing);
  }
  return existing;
}

async function runAndNormalize(customer: CustomerRecord): Promise<NewsResearchBundle> {
  const research = await runNewsResearch(customer);
  return {
    responseId: research.responseId,
    payload: research.payload,
    rawText: research.rawText,
    customerNews: normalizeSection(research.payload.customerNews, 15),
    competitorNews: normalizeSection(research.payload.competitorNews, 10),
    industryTrends: normalizeSection(research.payload.industryTrends, 15),
  };
}

function normalizeSection(items: Array<{ title?: string; url?: string; summary?: string; source?: string }> = [], limit: number) {
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

function normalizeUrl(url?: string | null) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function deriveSourceFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return 'source';
  }
}
