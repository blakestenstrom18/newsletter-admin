import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function NewsletterViewPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;
  
  const [run] = await db
    .select()
    .from(newsletterRun)
    .where(eq(newsletterRun.id, runId))
    .limit(1);

  if (!run || run.customerId !== id) {
    notFound();
  }

  const [customer] = await db
    .select()
    .from(customerConfig)
    .where(eq(customerConfig.id, id))
    .limit(1);

  if (!run.content) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Newsletter</h1>
          <Link href={`/customers/${id}`}>
            <Button variant="outline">Back to Customer</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Newsletter content not available.</p>
            {run.status === 'error' && run.errorMessage && (
              <p className="mt-2 text-sm text-destructive">Error: {run.errorMessage}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = run.content;
  const generatedDate = new Date(content.generatedAtIso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{customer?.name} Newsletter</h1>
          <p className="text-muted-foreground">Generated {generatedDate}</p>
        </div>
        <div className="flex gap-2">
          {run.googleDocUrl && (
            <Button asChild variant="outline">
              <a href={run.googleDocUrl} target="_blank" rel="noopener noreferrer">
                View in Google Docs
              </a>
            </Button>
          )}
          <Link href={`/customers/${id}`}>
            <Button variant="outline">Back to Customer</Button>
          </Link>
        </div>
      </div>

      <div className="prose prose-slate max-w-none">
        <Card>
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{content.executiveSummary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What&apos;s New For You</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 list-none pl-0">
              {content.customerHighlights.map((highlight, idx) => (
                <li key={idx} className="border-l-4 border-primary pl-4">
                  <p className="font-medium">{highlight.summary}</p>
                  <p className="text-muted-foreground mt-1">
                    <strong>Implication for {customer?.name}:</strong> {highlight.implication}
                  </p>
                  {highlight.sourceUrl && (
                    <a
                      href={highlight.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                      Source →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Industry Trends We&apos;re Watching</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 list-none pl-0">
              {content.industryTrends.map((trend, idx) => (
                <li key={idx} className="border-l-4 border-primary pl-4">
                  <p className="font-medium">{trend.trend}</p>
                  <p className="text-muted-foreground mt-1">
                    <strong>Why it matters:</strong> {trend.implication}
                  </p>
                  {trend.sourceUrl && (
                    <a
                      href={trend.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                      Source →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Updates from Iterate.ai</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-none pl-0">
              {content.iterateUpdates.map((update, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <div>
                    <p>{update.update}</p>
                    {update.sourceUrl && (
                      <a
                        href={update.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Learn more →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ideas for Future Collaboration</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 list-none pl-0">
              {content.futureIdeas.map((idea, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <div>
                    <p className="font-medium">{idea.idea}</p>
                    <p className="text-sm text-muted-foreground">Value: {idea.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

