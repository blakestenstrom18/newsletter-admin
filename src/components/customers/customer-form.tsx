'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const FormSchema = z.object({
  name: z.string().min(2),
  industry: z.string().min(2),
  active: z.boolean().default(true),
  frequency: z.enum(['weekly','biweekly','monthly']).default('biweekly'),
  timezone: z.string().default('America/Denver'),
  tone: z.enum(['formal','consultative','friendly_exec','concise']).default('friendly_exec'),
  maxItemsPerSection: z.coerce.number().min(1).max(10).default(4),
  prUrls: z.string().optional(),
  newsKeywords: z.string().optional(),
  competitors: z.string().optional(),
  accountOwnerName: z.string().optional(),
  accountOwnerEmail: z.string().email().optional().or(z.literal('')),
  keyPriorities: z.string().optional(),
  currentInitiatives: z.string().optional(),
  internalDocUrl: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.input<typeof FormSchema>;

export default function CustomerForm({ initial, isEdit = false, customerId }: { initial?: Partial<FormValues>; isEdit?: boolean; customerId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({ 
    resolver: zodResolver(FormSchema), 
    defaultValues: {
      active: true,
      frequency: 'biweekly',
      timezone: 'America/Denver',
      tone: 'friendly_exec',
      maxItemsPerSection: 4,
      ...initial,
    } 
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const body = {
        ...values,
        prUrls: split(values.prUrls),
        newsKeywords: split(values.newsKeywords),
        competitors: split(values.competitors),
        keyPriorities: split(values.keyPriorities),
        accountOwnerEmail: values.accountOwnerEmail || undefined,
        internalDocUrl: values.internalDocUrl || undefined,
      };
      const url = isEdit && customerId ? `/api/customers/${customerId}` : '/api/customers';
      const method = isEdit ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setLoading(false);
      if (!r.ok) {
        const error = await r.json();
        toast.error('Failed to save', { description: error.error || 'Unknown error' });
        return;
      }
      const created = await r.json();
      toast.success(isEdit ? 'Customer updated' : 'Customer created');
      router.push(`/customers/${created.id}`);
    } catch (err) {
      setLoading(false);
      toast.error('Failed to save', { description: String(err) });
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input {...form.register('name')} />
          {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div>
          <Label>Industry</Label>
          <Input {...form.register('industry')} />
          {form.formState.errors.industry && <p className="text-sm text-destructive">{form.formState.errors.industry.message}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Switch {...form.register('active')} checked={form.watch('active')} onCheckedChange={(checked) => form.setValue('active', checked)} />
          <Label>Active</Label>
        </div>
        <div>
          <Label>Timezone</Label>
          <Input {...form.register('timezone')} placeholder="America/Denver" />
        </div>
        <div>
          <Label>Frequency</Label>
          <Input {...form.register('frequency')} placeholder="biweekly" />
        </div>
        <div>
          <Label>Tone</Label>
          <Input {...form.register('tone')} placeholder="friendly_exec" />
        </div>
        <div>
          <Label>Max Items / Section</Label>
          <Input type="number" {...form.register('maxItemsPerSection', { valueAsNumber: true })} />
        </div>
        <div>
          <Label>PR URLs (comma-separated)</Label>
          <Textarea rows={2} {...form.register('prUrls')} />
        </div>
        <div>
          <Label>News Keywords (comma-separated)</Label>
          <Textarea rows={2} {...form.register('newsKeywords')} />
        </div>
        <div>
          <Label>Competitors (comma-separated)</Label>
          <Textarea rows={2} {...form.register('competitors')} />
        </div>
        <div>
          <Label>Key Priorities (comma-separated)</Label>
          <Textarea rows={2} {...form.register('keyPriorities')} />
        </div>
        <div className="md:col-span-2">
          <Label>Current Initiatives</Label>
          <Textarea rows={3} {...form.register('currentInitiatives')} />
        </div>
        <div className="md:col-span-2">
          <Label>Internal Doc URL</Label>
          <Input {...form.register('internalDocUrl')} />
        </div>
      </div>
      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
    </form>
  );
}

function split(s?: string) {
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

