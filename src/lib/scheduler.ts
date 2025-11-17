import { differenceInDays } from 'date-fns';

// naive schedule: weekly=7, biweekly=14, monthly=28 days
export function isCustomerDue(cust: any, now: Date) {
  const last = cust.lastRunAt ? new Date(cust.lastRunAt) : null;
  const days = cust.frequency === 'weekly' ? 7 : cust.frequency === 'monthly' ? 28 : 14;
  if (!last) return true;
  return differenceInDays(now, last) >= days;
}

