import Link from 'next/link';
import { db } from '@/db';
import { customerConfig } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const customers = await db.query.customerConfig.findMany({
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-muted-foreground mb-2">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Customers</span>
          </nav>
          <h1 className="text-3xl font-semibold">Customers</h1>
        </div>
        <Link href="/customers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        </Link>
      </div>
      <div className="grid gap-4">
        {customers.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.industry}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Active' : 'Paused'}</Badge>
                  <Badge variant="outline">{c.frequency}</Badge>
                  <Link href={`/customers/${c.id}`}>
                    <Button variant="outline">Open</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {customers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No customers yet.</p>
              <Link href="/customers/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Customer
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

