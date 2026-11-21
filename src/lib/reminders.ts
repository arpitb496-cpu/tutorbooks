import { formatINR } from './money';

export type Tone = 'polite' | 'firm' | 'final';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Formats an ISO 'YYYY-MM-DD' string as e.g. '5 Jun 2025' without timezone shifts.
function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const monthName = MONTHS[(month ?? 1) - 1] ?? '';
  return `${day ?? 0} ${monthName} ${year ?? 0}`;
}

export function draftReminder(
  tone: Tone,
  p: { customerName: string; amount: number; dueDate: string; daysOverdue: number },
): string {
  const amount = formatINR(p.amount);
  const due = formatDueDate(p.dueDate);

  switch (tone) {
    case 'polite':
      return `Hi ${p.customerName}, a warm reminder that the fee of ${amount} was due on ${due}. If you have already paid, please ignore this note, and thank you so much. Otherwise, we would be grateful if you could settle it at your convenience.`;
    case 'firm':
      return `Hi ${p.customerName}, the fee of ${amount} was due on ${due} and is now overdue by ${p.daysOverdue} days. Please arrange payment this week so that our classes stay on track. Kindly reply if there is any issue we should know about.`;
    case 'final':
      return `Hi ${p.customerName}, this is a final notice regarding the outstanding fee of ${amount}, due on ${due}. If payment is not received within 3 days, the matter will be escalated. Please contact us today to settle the amount and avoid further action.`;
  }
}
