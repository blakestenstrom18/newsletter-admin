import Link from 'next/link';
export default function Home() {
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-semibold">Customer Newsletters</h1>
      <p className="text-muted-foreground">Internal admin portal</p>
      <div>
        <Link className="underline" href="/customers">Go to Customers →</Link>
      </div>
    </main>
  );
}
