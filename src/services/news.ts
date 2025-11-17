type NewsArticle = { title: string; url: string; description?: string; source?: string };

const NEWS_BASE = 'https://newsapi.org/v2/everything';

async function fetchNews(q: string, fromIso: string) {
  const url = new URL(NEWS_BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('from', fromIso);
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('language', 'en');
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('apiKey', process.env.NEWS_API_KEY!);

  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`News API error: ${r.status}`);
  const data = await r.json();
  return (data.articles ?? []).map((a: any) => ({
    title: a.title, url: a.url, description: a.description, source: a.source?.name,
  })) as NewsArticle[];
}

export async function fetchCustomerNews(customer: any) {
  const from = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const terms = (customer.newsKeywords?.length ? customer.newsKeywords : [customer.name]).slice(0, 3);
  const lists = await Promise.all(terms.map((q: string) => fetchNews(q, from)));
  const dedup = new Map<string, NewsArticle>();
  for (const list of lists) for (const a of list) if (!dedup.has(a.url)) dedup.set(a.url, a);
  return Array.from(dedup.values()).slice(0, 15);
}

export async function fetchCompetitorNews(competitors: string[]) {
  const from = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const lists = await Promise.all(competitors.slice(0, 5).map((q) => fetchNews(q, from)));
  const dedup = new Map<string, NewsArticle>();
  for (const list of lists) for (const a of list) if (!dedup.has(a.url)) dedup.set(a.url, a);
  return Array.from(dedup.values()).slice(0, 10);
}

export async function fetchIndustryTrends(industry: string, subVerticals: string[] = []) {
  const from = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const q = [industry, ...subVerticals.map((s) => `${s} ${industry}`)].join(' OR ');
  return fetchNews(q, from);
}

