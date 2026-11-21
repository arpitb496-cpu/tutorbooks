// Synthetic sample data for demos. No real people or phone numbers.
// Every date is computed from `today` at runtime; nothing is hard-coded.
import type { AppData, Bill, Customer, Invoice, Payment } from './types';
import { addDays } from './dates';

/** Cash in hand at the start of the sample forecast, in INR. */
export const SAMPLE_OPENING_BALANCE = 20000;

// A paid earlier invoice. `back` is how many days before today its due date was.
// `delay` is days paid after the due date. `share` is the fraction paid
// (default 1 = full payment; less than 1 leaves the invoice partially paid).
interface Step {
  back: number;
  delay: number;
  share?: number;
}

interface Seed {
  id: string;
  name: string;
  parentName: string;
  parentPhone: string;   // 10-digit Indian mobile
  monthlyFee: number;    // INR, between 1500 and 6000
  dueDay: number;
  notes: string;
  // Due date of the one open invoice, as days from today (negative = overdue).
  openOffset: number;
  history: Step[];
}

const SEEDS: Seed[] = [
  {
    id: 'c1',
    name: 'Ananya Sharma',
    parentName: 'Rajesh Sharma',
    parentPhone: '+91 00000 00001',
    monthlyFee: 3000,
    dueDay: 5,
    notes: 'Class 10 maths, Tue and Thu',
    openOffset: 3,
    history: [{ back: 60, delay: 0 }, { back: 30, delay: 1 }],
  },
  {
    id: 'c2',
    name: 'Rohan Mehta',
    parentName: 'Sunita Mehta',
    parentPhone: '+91 00000 00002',
    monthlyFee: 1500,
    dueDay: 1,
    notes: 'Class 4 English',
    openOffset: 8,
    history: [{ back: 55, delay: 0 }, { back: 25, delay: 2 }],
  },
  {
    id: 'c3',
    name: 'Ishita Verma',
    parentName: 'Neha Verma',
    parentPhone: '+91 00000 00003',
    monthlyFee: 4500,
    dueDay: 7,
    notes: 'Class 8 science, batch of 3',
    openOffset: -2,
    history: [{ back: 70, delay: 12 }, { back: 40, delay: 14 }],
  },
  {
    id: 'c4',
    name: 'Arjun Nair',
    parentName: 'Mohan Nair',
    parentPhone: '+91 00000 00004',
    monthlyFee: 6000,
    dueDay: 10,
    notes: 'JEE physics, two days a week',
    openOffset: -5,
    history: [{ back: 75, delay: 9, share: 0.5 }, { back: 45, delay: 17 }],
  },
  {
    id: 'c5',
    name: 'Kavya Iyer',
    parentName: 'Lakshmi Iyer',
    parentPhone: '+91 00000 00005',
    monthlyFee: 2500,
    dueDay: 3,
    notes: 'Class 6 maths',
    openOffset: -12,
    history: [{ back: 80, delay: 9 }, { back: 50, delay: 10, share: 0.6 }],
  },
  {
    id: 'c6',
    name: 'Dev Malhotra',
    parentName: 'Vikram Malhotra',
    parentPhone: '+91 00000 00006',
    monthlyFee: 4000,
    dueDay: 8,
    notes: 'Class 9 Hindi, usually pays about a month late',
    openOffset: -20,
    history: [{ back: 85, delay: 30 }, { back: 55, delay: 31 }],
  },
  {
    id: 'c7',
    name: 'Meera Joshi',
    parentName: 'Anil Joshi',
    parentPhone: '+91 00000 00007',
    monthlyFee: 2000,
    dueDay: 9,
    notes: 'Class 5 EVS, pays irregularly',
    openOffset: -35,
    history: [{ back: 80, delay: 3 }, { back: 50, delay: 24 }],
  },
  {
    id: 'c8',
    name: 'Priya Rao',
    parentName: 'Suresh Rao',
    parentPhone: '+91 00000 00008',
    monthlyFee: 1800,
    dueDay: 6,
    notes: 'Enrolled recently, pays on time',
    openOffset: -45,
    history: [{ back: 70, delay: 5 }],
  },
];

/**
 * Builds a believable back-office dataset relative to `today` (YYYY-MM-DD):
 * eight customers, each with earlier paid invoices (some partly paid) and one
 * open invoice spread across not-yet-due, 1-7, 8-30 and 30+ days overdue.
 * Three recurring monthly bills fall due within 5-60 days.
 */
export function buildSampleData(today: string): AppData {
  const customers: Customer[] = [];
  const invoices: Invoice[] = [];

  for (const seed of SEEDS) {
    customers.push({
      id: seed.id,
      name: seed.name,
      parentName: seed.parentName,
      parentPhone: seed.parentPhone,
      monthlyFee: seed.monthlyFee,
      dueDay: seed.dueDay,
      notes: seed.notes,
    });

    seed.history.forEach((step, i) => {
      const invoiceId = `inv-${seed.id}-${i + 1}`;
      const dueDate = addDays(today, -step.back);
      const payDate = addDays(dueDate, step.delay);
      const payments: Payment[] = [];
      if (payDate <= today) {
        payments.push({
          id: `pay-${invoiceId}`,
          amount: Math.round(seed.monthlyFee * (step.share ?? 1)),
          date: payDate,
        });
      }
      invoices.push({
        id: invoiceId,
        customerId: seed.id,
        amount: seed.monthlyFee,
        issueDate: addDays(dueDate, -30),
        dueDate,
        draft: false,
        payments,
      });
    });

    const openDue = addDays(today, seed.openOffset);
    invoices.push({
      id: `inv-${seed.id}-open`,
      customerId: seed.id,
      amount: seed.monthlyFee,
      issueDate: addDays(openDue, -30),
      dueDate: openDue,
      draft: false,
      payments: [],
    });
  }

  const bills: Bill[] = [
    {
      id: 'bill-rent',
      name: 'Room rent',
      category: 'rent',
      amount: 12000,
      dueDate: addDays(today, 6),
      recurrence: 'monthly',
    },
    {
      id: 'bill-internet',
      name: 'Broadband internet',
      category: 'internet',
      amount: 999,
      dueDate: addDays(today, 18),
      recurrence: 'monthly',
    },
    {
      id: 'bill-materials',
      name: 'Whiteboard and markers',
      category: 'materials',
      amount: 2500,
      dueDate: addDays(today, 40),
      recurrence: 'monthly',
    },
  ];

  return {
    customers,
    invoices,
    bills,
    openingBalance: SAMPLE_OPENING_BALANCE,
  };
}
