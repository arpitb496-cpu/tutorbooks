// Ageing and outstanding-balance logic. Pure functions, no React.
// Drafts are never chased, so they contribute nothing to outstanding amounts.
import type { Customer, Invoice, ISODate, Payment } from './types';
import { daysBetween, monthOf } from './dates';

export type AgeingBucket = 'current' | '0-7' | '8-30' | '30+';

export interface DashboardRow {
  customerId: string;
  customerName: string;
  outstanding: number;
  oldestDueDate: ISODate;
  daysOverdue: number;
  bucket: AgeingBucket;
}

/** Unpaid amount on one invoice: amount minus its own payments. Drafts return 0. */
export function invoiceOutstanding(inv: Invoice): number {
  if (inv.draft) return 0;
  const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, inv.amount - paid);
}

/** Whole days past due; 0 if not overdue or nothing is outstanding. */
export function daysOverdue(dueDate: ISODate, today: ISODate, outstanding: number): number {
  if (outstanding <= 0) return 0;
  const days = daysBetween(dueDate, today);
  return days > 0 ? days : 0;
}

/** 0 days -> 'current'; 1-7 -> '0-7'; 8-30 -> '8-30'; 31+ -> '30+'. */
export function ageingBucket(days: number): AgeingBucket {
  if (days <= 0) return 'current';
  if (days <= 7) return '0-7';
  if (days <= 30) return '8-30';
  return '30+';
}

/**
 * One row per customer with a positive outstanding balance, sorted by
 * days overdue (oldest first). Days overdue is measured from the customer's
 * oldest unpaid due date. `_payments` is unused: outstanding is derived from
 * each invoice's own payments, since the flat Payment type has no invoice link.
 */
export function dashboardRows(
  customers: Customer[],
  invoices: Invoice[],
  _payments: Payment[],
  today: ISODate,
): DashboardRow[] {
  const rows: DashboardRow[] = [];
  for (const c of customers) {
    let outstanding = 0;
    let oldest: ISODate | null = null;
    for (const inv of invoices) {
      if (inv.customerId !== c.id) continue;
      const open = invoiceOutstanding(inv);
      if (open <= 0) continue;
      outstanding += open;
      if (oldest === null || inv.dueDate < oldest) oldest = inv.dueDate;
    }
    if (outstanding <= 0 || oldest === null) continue;
    const days = daysOverdue(oldest, today, outstanding);
    rows.push({
      customerId: c.id,
      customerName: c.name,
      outstanding,
      oldestDueDate: oldest,
      daysOverdue: days,
      bucket: ageingBucket(days),
    });
  }
  rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return rows;
}

/** Sum of unpaid amounts across all non-draft invoices. */
export function totalOutstanding(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + invoiceOutstanding(inv), 0);
}

/** Sum of payments dated in the same YYYY-MM as `today`. */
export function collectedThisMonth(payments: Payment[], today: ISODate): number {
  const month = monthOf(today);
  return payments
    .filter((p) => monthOf(p.date) === month)
    .reduce((sum, p) => sum + p.amount, 0);
}
