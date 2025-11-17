'use client';

import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import CustomerForm from '@/components/customers/customer-form';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, mutate } = useSWR(`/api/customers/${id}`, fetcher);
  const [running, setRunning] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  if (!data) return <div>Loading...</div>;

  async function runNow() {
    setRunning(true);
    try {
      const r = await fetch(`/api/customers/${id}/run`, { method: 'POST' });
      setRunning(false);
      if (!r.ok) {
        const error = await r.json();
        toast.error('Generation failed', { description: error.error || error.details || 'Unknown error' });
        return;
      }
      const j = await r.json();
      toast.success('Newsletter generated', { description: `Doc: ${j.googleDocUrl}` });
      mutate();
    } catch (err) {
      setRunning(false);
      toast.error('Generation failed', { description: String(err) });
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Edit Customer</h1>
          <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
        </div>
        <CustomerForm initial={formData} isEdit={true} customerId={id} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <div className="text-muted-foreground">{data.industry}</div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEdit(true)} variant="outline">Edit</Button>
          <Button onClick={runNow} disabled={running}>{running ? 'Running...' : 'Run Newsletter Now'}</Button>
        </div>
      </div>
      <div className="rounded-md border p-4">
        <pre className="text-sm overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
      </div>
      <div>
        <Link href="/customers" className="text-sm text-muted-foreground underline">← Back to Customers</Link>
      </div>
    </div>
  );
}

