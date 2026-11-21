// All dates are ISO strings in the form YYYY-MM-DD.
export type ISODate = string;

export type BillCategory = 'rent' | 'internet' | 'materials' | 'other';
export type Recurrence = 'none' | 'monthly' | 'yearly';

export interface Customer {
  id: string;
  name: string;          // student name
  parentName: string;
  parentPhone: string;   // 10-digit Indian mobile, or with +91 / 91 prefix
  monthlyFee: number;    // INR
  dueDay: number;        // day of month the fee is due, 1-28
  notes: string;
}

export interface Payment {
  id: string;
  amount: number;        // INR
  date: ISODate;
}

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;        // INR
  issueDate: ISODate;
  dueDate: ISODate;
  draft: boolean;        // drafts are not chased or forecast
  payments: Payment[];
}

export interface Bill {
  id: string;
  name: string;
  category: BillCategory;
  amount: number;        // INR
  dueDate: ISODate;      // first due date
  recurrence: Recurrence;
}

export interface AppData {
  customers: Customer[];
  invoices: Invoice[];
  bills: Bill[];
  openingBalance: number; // INR cash in hand at the start of the forecast
}