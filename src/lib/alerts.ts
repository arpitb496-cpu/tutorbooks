// Alerts for the dashboard. Pure functions, no React.
// Reuses ageing and forecast logic rather than reimplementing it.
import type { AppData, ISODate, Payment } from './types';
import { daysBetween } from './dates';
import { dashboardRows } from './ageing';
import { buildForecast } from './forecast';
import { draftReminder } from './reminders';
import { whatsAppLink } from './whatsapp';
import { formatINR } from './money';

export type Alert = {
  id: string;
  severity: 'high' | 'medium' | 'info';
  message: string;
  actionLabel: string;
  action: { kind: 'whatsapp'; href: string; message: string } | { kind: 'scroll'; target: string };
};

const BILL_WINDOW_DAYS = 7;
const FORECAST_DAYS = 60;

export function buildAlerts(data: AppData, today: ISODate): Alert[] {
  const alerts: Alert[] = [];
  const allPayments: Payment[] = data.invoices.flatMap((inv) => inv.payments);

  // Overdue customers: one chase alert each.
  const rows = dashboardRows(data.customers, data.invoices, allPayments, today);
  for (const row of rows) {
    if (row.daysOverdue <= 0) continue;
    const customer = data.customers.find((c) => c.id === row.customerId);
    if (customer === undefined) continue;
    const firstName = row.customerName.split(' ')[0] ?? row.customerName;
    const tone = row.daysOverdue <= 30 ? 'firm' : 'final';
    const message = draftReminder(tone, {
      customerName: row.customerName,
      amount: row.outstanding,
      dueDate: row.oldestDueDate,
      daysOverdue: row.daysOverdue,
    });
    alerts.push({
      id: `overdue-${row.customerId}`,
      severity: row.daysOverdue > 30 ? 'high' : 'medium',
      message: `${row.customerName} is ${row.daysOverdue} days overdue: ${formatINR(row.outstanding)}`,
      actionLabel: `Chase ${firstName}'s invoice today`,
      action: { kind: 'whatsapp', href: whatsAppLink(customer.parentPhone, message), message },
    });
  }

  // Bills due within the next 0-7 days: check projected cash on the due date.
  const upcoming = data.bills.filter((bill) => {
    const n = daysBetween(today, bill.dueDate);
    return n >= 0 && n <= BILL_WINDOW_DAYS;
  });
  if (upcoming.length > 0) {
    const forecast = buildForecast({
      today,
      openingBalance: data.openingBalance,
      customers: data.customers,
      invoices: data.invoices,
      payments: allPayments,
      bills: data.bills,
      days: FORECAST_DAYS,
    });
    for (const bill of upcoming) {
      const days = daysBetween(today, bill.dueDate);
      const point = forecast.daily.find((p) => p.date === bill.dueDate);
      if (point === undefined) continue;
      // point.balance is the closing balance on the due date, which already
      // deducts this bill, so a negative balance means cash is short.
      if (point.balance < 0) {
        alerts.push({
          id: `bill-short-${bill.id}`,
          severity: 'high',
          message: `${bill.name} due in ${days} days, cash short by ${formatINR(Math.round(-point.balance))}`,
          actionLabel: 'Review forecast',
          action: { kind: 'scroll', target: 'cash-forecast' },
        });
      } else {
        alerts.push({
          id: `bill-covered-${bill.id}`,
          severity: 'info',
          message: `${bill.name} due in ${days} days, covered`,
          actionLabel: 'View bills',
          action: { kind: 'scroll', target: 'bills' },
        });
      }
    }
  }

  return alerts;
}
