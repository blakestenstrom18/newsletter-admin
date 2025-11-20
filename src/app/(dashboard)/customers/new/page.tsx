import CustomerForm from '@/components/customers/customer-form';
import Link from 'next/link';

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-muted-foreground mb-2">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/customers" className="hover:text-foreground">Customers</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">New</span>
        </nav>
        <h1 className="text-3xl font-semibold">New Customer</h1>
      </div>
      <CustomerForm />
    </div>
  );
}

