import OpenAI from 'openai';
import { NewsletterContent } from '@/lib/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function synthesizeNewsletter(opts: {
  customer: any;
  customerNews: Array<{ title: string; url: string; description?: string }>;
  competitorNews: Array<{ title: string; url: string; description?: string }>;
  industryTrends: Array<{ title: string; url: string; description?: string }>;
  iterateUpdates: Array<{ update: string; sourceUrl?: string }>;
}): Promise<NewsletterContent> {
  const { customer, customerNews, competitorNews, industryTrends, iterateUpdates } = opts;

  const system = `You generate concise, executive-ready newsletters for enterprise stakeholders.
Tone: ${customer.tone ?? 'friendly_exec'}. Avoid marketing fluff. Use short bullets.
Always include "Implication for ${customer.name}:" for customer highlight bullets.
Sensitive topics to avoid: ${(customer.sensitiveTopics ?? []).join(', ') || 'none'}.
Key priorities: ${(customer.keyPriorities ?? []).join('; ') || 'n/a'}.`;

  const user = {
    role: 'user' as const,
    content: JSON.stringify({
      customer: {
        name: customer.name,
        industry: customer.industry,
        subVerticals: customer.subVerticals,
        keyPriorities: customer.keyPriorities,
        currentInitiatives: customer.currentInitiatives,
      },
      sections: {
        customerNews,
        competitorNews,
        industryTrends,
        iterateUpdates,
      },
      maxItemsPerSection: customer.maxItemsPerSection ?? 4,
    }),
  };

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      {
        role: 'system',
        content:
`Return strictly in this JSON schema:

{
  "executiveSummary": "string",
  "customerHighlights": [{"summary":"string","implication":"string","sourceUrl":"string?"}],
  "industryTrends": [{"trend":"string","implication":"string","sourceUrl":"string?"}],
  "iterateUpdates": [{"update":"string","sourceUrl":"string?"}],
  "futureIdeas": [{"idea":"string","value":"string"}],
  "generatedAtIso": "ISO8601 string"
}

Constraints:
- customerHighlights: 3-${customer.maxItemsPerSection ?? 4} items
- industryTrends: 2-${customer.maxItemsPerSection ?? 4} items
- iterateUpdates: 2-${customer.maxItemsPerSection ?? 4} items
- futureIdeas: 2-3 items`,
      },
      user,
    ],
    response_format: { type: 'json_object' },
  });

  const text = resp.choices[0]?.message?.content || '{}';
  const json = JSON.parse(text);
  return json as NewsletterContent;
}

