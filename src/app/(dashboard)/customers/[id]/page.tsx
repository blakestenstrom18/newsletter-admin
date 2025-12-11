'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import CustomerForm from '@/components/customers/customer-form';
import Link from 'next/link';
import { ArrowLeft, Edit, Play, FileText, Calendar, Settings, Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Helper to determine badge variant for newsletter status
function getStatusBadgeVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (status) {
    case 'success':
      return 'default';
    case 'error':
      return 'destructive';
    case 'researching':
      return 'outline';
    default:
      return 'secondary';
  }
}

// Helper to format status display
function getStatusDisplay(status: string): string {
  switch (status) {
    case 'researching':
      return 'Researching...';
    case 'pending':
      return 'Pending';
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, mutate } = useSWR(id ? `/api/customers/${id}` : null, fetcher);
  const { data: newsletters, mutate: mutateNewsletters } = useSWR(
    id ? `/api/customers/${id}/newsletters` : null, 
    fetcher,
    {
      // Auto-refresh every 30 seconds if there are researching jobs
      refreshInterval: (newsletters: Array<{ status: string }> | undefined) => {
        if (!newsletters) return 0;
        const hasResearching = newsletters.some((n: { status: string }) => n.status === 'researching');
        return hasResearching ? 30000 : 0; // 30 seconds if researching, otherwise don't auto-refresh
      },
    }
  );
  const [running, setRunning] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Check if there are any researching newsletters
  const hasResearchingNewsletters = newsletters?.some((n: { status: string }) => n.status === 'researching');

  // Show toast when a researching newsletter completes
  useEffect(() => {
    if (newsletters && !hasResearchingNewsletters && running === false) {
      // Check if the most recent newsletter just completed
      const mostRecent = newsletters[0];
      if (mostRecent?.status === 'success') {
        // The toast would have already been shown when starting
      }
    }
  }, [newsletters, hasResearchingNewsletters, running]);

  if (!id) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  async function runNow() {
    setRunning(true);
    try {
      const r = await fetch(`/api/customers/${id}/run`, { method: 'POST' });
      const j = await r.json();
      setRunning(false);
      
      if (!r.ok) {
        toast.error('Failed to start research', { 
          description: j.error || j.details || 'Unknown error' 
        });
        return;
      }
      
      // New async flow - research has started but not completed yet
      if (j.status === 'researching') {
        toast.success('Research started', { 
          description: 'Deep research is running. This typically takes 5-30 minutes. The page will auto-refresh.',
          duration: 8000,
        });
      } else {
        // Legacy sync flow (shouldn't happen anymore)
        const message = j.googleDocUrl 
          ? `View in app or Google Docs: ${j.googleDocUrl}`
          : 'Newsletter generated and stored in database';
        toast.success('Newsletter generated', { description: message });
      }
      
      mutate(); // Refresh customer data
      mutateNewsletters(); // Refresh newsletter list
    } catch (err) {
      setRunning(false);
      toast.error('Failed to start research', { description: String(err) });
    }
  }

  if (showEdit) {
    // Convert arrays to comma-separated strings for form
    const formData = {
      ...data,
      prUrls: Array.isArray(data.prUrls) ? data.prUrls.join(', ') : data.prUrls || '',
      newsKeywords: Array.isArray(data.newsKeywords) ? data.newsKeywords.join(', ') : data.newsKeywords || '',
      competitors: Array.isArray(data.competitors) ? data.competitors.join(', ') : data.competitors || '',
      keyPriorities: Array.isArray(data.keyPriorities) ? data.keyPriorities.join(', ') : data.keyPriorities || '',
    };
    
    return (
      <div className="space-y-6">
        <div>
          <nav className="text-sm text-muted-foreground mb-2">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/customers" className="hover:text-foreground">Customers</Link>
            <span className="mx-2">/</span>
            <Link href={`/customers/${id}`} className="hover:text-foreground">{data.name}</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Edit</span>
          </nav>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold">Edit Customer</h1>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
        <CustomerForm initial={formData} isEdit={true} customerId={id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-muted-foreground mb-2">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/customers" className="hover:text-foreground">Customers</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{data.name}</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{data.name}</h1>
            <div className="text-muted-foreground mt-1">{data.industry}</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowEdit(true)} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button onClick={runNow} disabled={running || hasResearchingNewsletters}>
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : hasResearchingNewsletters ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Research in Progress...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Newsletter Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Newsletter History</h2>
          {hasResearchingNewsletters && (
            <Badge variant="outline" className="ml-2">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Auto-refreshing
            </Badge>
          )}
        </div>
        {newsletters && newsletters.length > 0 ? (
          <div className="space-y-2">
            {newsletters.map((newsletter: { 
              id: string; 
              startedAt: string; 
              status: string; 
              triggerType: string; 
              errorMessage?: string; 
              content?: Record<string, unknown> | null;
              googleDocUrl?: string;
            }) => (
              <Card key={newsletter.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(newsletter.startedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <Badge 
                          variant={getStatusBadgeVariant(newsletter.status)}
                          className={newsletter.status === 'researching' ? 'animate-pulse' : ''}
                        >
                          {newsletter.status === 'researching' && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {getStatusDisplay(newsletter.status)}
                        </Badge>
                        <Badge variant="outline">{newsletter.triggerType}</Badge>
                      </div>
                      {newsletter.status === 'researching' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Deep research is running. This typically takes 5-30 minutes...
                        </p>
                      )}
                      {newsletter.errorMessage && (
                        <p className="text-sm text-destructive mt-1">{newsletter.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {newsletter.content && (
                        <Link href={`/customers/${id}/newsletters/${newsletter.id}`}>
                          <Button variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      )}
                      {newsletter.googleDocUrl && (
                        <Button variant="outline" asChild>
                          <a href={newsletter.googleDocUrl} target="_blank" rel="noopener noreferrer">
                            Google Docs
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No newsletters generated yet.</p>
              <Button onClick={runNow} disabled={running}>
                <Play className="mr-2 h-4 w-4" />
                {running ? 'Starting...' : 'Generate First Newsletter'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Customer Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
              <Badge variant={data.active ? 'default' : 'secondary'}>{data.active ? 'Active' : 'Paused'}</Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Frequency</div>
              <div className="text-sm">{data.frequency}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Timezone</div>
              <div className="text-sm">{data.timezone}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Tone</div>
              <div className="text-sm">{data.tone}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Max Items per Section</div>
              <div className="text-sm">{data.maxItemsPerSection}</div>
            </div>
            {data.accountOwnerName && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Account Owner</div>
                <div className="text-sm">{data.accountOwnerName}</div>
                {data.accountOwnerEmail && (
                  <div className="text-sm text-muted-foreground">{data.accountOwnerEmail}</div>
                )}
              </div>
            )}
            {data.newsKeywords && data.newsKeywords.length > 0 && (
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-muted-foreground mb-1">News Keywords</div>
                <div className="text-sm">{data.newsKeywords.join(', ')}</div>
              </div>
            )}
            {data.competitors && data.competitors.length > 0 && (
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-muted-foreground mb-1">Competitors</div>
                <div className="text-sm">{data.competitors.join(', ')}</div>
              </div>
            )}
            {data.keyPriorities && data.keyPriorities.length > 0 && (
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-muted-foreground mb-1">Key Priorities</div>
                <div className="text-sm">{data.keyPriorities.join(', ')}</div>
              </div>
            )}
            {data.currentInitiatives && (
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-muted-foreground mb-1">Current Initiatives</div>
                <div className="text-sm">{data.currentInitiatives}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <Link href="/customers">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </div>
    </div>
  );
}
