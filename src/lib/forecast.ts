// 90-day cash forecast. Pure functions, no React.
// Receipts land on invoice dueDate + the customer's average payment delay.
// Bills go out on their due dates, repeating monthly or yearly across the window.
import type { Bill, Customer, ISODate, Invoice, Payment } from './types';
import { addDays, daysBetween, dueDateForMonth, parseISO } from './dates';
import { invoiceOutstanding } from './ageing';

export type Scenario =
  | { kind: 'late'; customerId: string; days: number }
  | { kind: 'skip'; customerId: string };

export interface DailyPoint {
  date: ISODate;
  balance: number;   // closing balance for the day
  receipts: number;
  outflows: number;
}

export interface Forecast {
  daily: DailyPoint[];
  lowest: { date: ISODate; balance: number };
  points: { d30: number; d60: number; d90: number };
}

export interface ForecastInput {
  today: ISODate;
  openingBalance: number;
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  bills: Bill[];
  days?: number;
  scenario?: Scenario;
}

/**
 * Mean days between invoice due date and payment date across this customer's
 * payments, rounded to the nearest whole day. 0 when there is no history.
 * `_payments` is unused: each payment is read via its invoice's `payments`.
 */
export function avgPaymentDelay(
  customerId: string,
  invoices: Invoice[],
  _payments: Payment[],
): number {
  let total = 0;
  let count = 0;
  for (const inv of invoices) {
    if (inv.customerId !== customerId) continue;
    for (const p of inv.payments) {
      total += daysBetween(inv.dueDate, p.date);
      count += 1;
    }
  }
  return count === 0 ? 0 : Math.round(total / count);
}


/** Dates on which a bill falls due within [today, end]. */
function billOccurrences(bill: Bill, today: ISODate, end: ISODate): ISODate[] {
  if (bill.recurrence === 'none') {
    return bill.dueDate >= today && bill.dueDate <= end ? [bill.dueDate] : [];
  }
  const { y, m, d } = parseISO(bill.dueDate);
  const step = bill.recurrence === 'yearly' ? 12 : 1;
  const out: ISODate[] = [];
  for (let k = 0; ; k++) {
    const monthIndex = y * 12 + (m - 1) + k * step;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const date = dueDateForMonth(year, month, d);
    if (date > end) break;
    if (date >= today) out.push(date);
  }
  return out;
}

export function buildForecast(input: ForecastInput): Forecast {
  const { today, openingBalance, customers, invoices, payments, bills, scenario } = input;
  const days = input.days ?? 90;
  const end = addDays(today, days);

  const known = new Set(customers.map((c) => c.id));
  const delays = new Map<string, number>();
  for (const c of customers) {
    delays.set(c.id, avgPaymentDelay(c.id, invoices, payments));
  }

  const events = new Map<ISODate, { receipts: number; outflows: number }>();
  const bump = (date: ISODate, field: 'receipts' | 'outflows', amount: number) => {
    const ev = events.get(date) ?? { receipts: 0, outflows: 0 };
    ev[field] += amount;
    events.set(date, ev);
  };

  // Receipts: open, non-draft invoices for known customers.
  for (const inv of invoices) {
    if (inv.draft || !known.has(inv.customerId)) continue;
    const open = invoiceOutstanding(inv);
    if (open <= 0) continue;
    if (scenario?.kind === 'skip' && scenario.customerId === inv.customerId) continue;

    let when = addDays(inv.dueDate, delays.get(inv.customerId) ?? 0);
    if (scenario?.kind === 'late' && scenario.customerId === inv.customerId) {
      when = addDays(when, scenario.days);
    }
    // Already-overdue money is assumed to land today rather than in the past.
    if (when < today) when = today;
    if (when > end) continue;
    bump(when, 'receipts', open);
  }

  // Outflows: bills on their due dates within the window.
  for (const bill of bills) {
    for (const date of billOccurrences(bill, today, end)) {
      bump(date, 'outflows', bill.amount);
    }
  }

  const daily: DailyPoint[] = [];
  let balance = openingBalance;
  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i);
    const ev = events.get(date) ?? { receipts: 0, outflows: 0 };
    balance += ev.receipts - ev.outflows;
    daily.push({ date, balance, receipts: ev.receipts, outflows: ev.outflows });
  }

  const balanceAt = (n: number): number => daily[Math.min(n, daily.length - 1)]?.balance ?? openingBalance;

  let lowest = { date: today, balance: openingBalance };
  for (const point of daily) {
    if (point.balance < lowest.balance) lowest = { date: point.date, balance: point.balance };
  }

  return {
    daily,
    lowest,
    points: { d30: balanceAt(30), d60: balanceAt(60), d90: balanceAt(90) },
  };
}
