export type Insight = { summary: string; implication: string; sourceUrl?: string };
export type Trend = { trend: string; implication: string; sourceUrl?: string };
export type IterateUpdate = { update: string; sourceUrl?: string };
export type FutureIdea = { idea: string; value: string };

export type NewsletterContent = {
  executiveSummary: string;
  customerHighlights: Insight[];
  industryTrends: Trend[];
  iterateUpdates: IterateUpdate[];
  futureIdeas: FutureIdea[];
  generatedAtIso: string;
};

export type TriggerType = 'scheduled' | 'manual';

