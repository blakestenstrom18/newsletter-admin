import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-muted-foreground mb-4">Internal admin portal for generating customer newsletters</p>
        <Link href="/customers">
          <Button size="lg">Go to Customers</Button>
        </Link>
      </div>
    </main>
  );
}
