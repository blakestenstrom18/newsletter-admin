import Link from 'next/link';
import { db } from '@/db';
import { customerConfig } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function CustomersPage() {
  const customers = await db.query.customerConfig.findMany({
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Link href="/customers/new"><Button>New Customer</Button></Link>
      </div>
      <div className="grid gap-4">
        {customers.map((c) => (
          <div key={c.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-medium">{c.name}</div>
                <div className="text-sm text-muted-foreground">{c.industry}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Active' : 'Paused'}</Badge>
                <Badge>{c.frequency}</Badge>
                <Link href={`/customers/${c.id}`}><Button variant="outline">Open</Button></Link>
              </div>
            </div>
          </div>
        ))}
        {customers.length === 0 && <div className="text-muted-foreground">No customers yet.</div>}
      </div>
    </div>
  );
}

