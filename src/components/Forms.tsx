import { useState, type FormEvent } from 'react';
import type { Bill, BillCategory, Customer, Invoice, Recurrence } from '../lib/types';

const BILL_CATEGORIES: BillCategory[] = ['rent', 'internet', 'materials', 'other'];
const RECURRENCES: Recurrence[] = ['none', 'monthly', 'yearly'];

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 } as const,
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 } as const,
  input: { padding: '6px 8px', fontSize: 14, border: '1px solid #bbb', borderRadius: 4 } as const,
  button: {
    padding: '8px 12px',
    fontSize: 14,
    border: 'none',
    borderRadius: 4,
    background: '#1f5fbf',
    color: '#fff',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  } as const,
  error: { color: '#b00020', fontSize: 13 } as const,
  heading: { margin: '0 0 4px', fontSize: 18 } as const,
};

type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Return a copy of the error map without the given field's message. */
function without<K extends string>(errs: FieldErrors<K>, key: K): FieldErrors<K> {
  const next = { ...errs };
  delete next[key];
  return next;
}

function FieldMessage({ message }: { message?: string }) {
  if (message === undefined) return null;
  return <div style={styles.error}>{message}</div>;
}

/** Parse YYYY-MM-DD into UTC year, 0-based month, day. */
function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Add n days to a YYYY-MM-DD string. */
function addDays(iso: string, n: number): string {
  const { y, m, d } = parseISO(iso);
  return toISO(new Date(Date.UTC(y, m, d + n)));
}

/** Add n months to a YYYY-MM-DD string, keeping the day of month and clamping to month end. */
function addMonths(iso: string, n: number): string {
  const { y, m, d } = parseISO(iso);
  const total = m + n;
  const targetYear = y + Math.floor(total / 12);
  const targetMonth = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return toISO(new Date(Date.UTC(targetYear, targetMonth, day)));
}

/** Next occurrence of dueDay on or after today (this month, else next month). */
function nextDueDate(today: string, dueDay: number): string {
  const { y, m } = parseISO(today);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const thisMonth = toISO(new Date(Date.UTC(y, m, Math.min(dueDay, lastDay))));
  return thisMonth >= today ? thisMonth : addMonths(thisMonth, 1);
}

function newId(prefix: string, suffix = ''): string {
  return prefix + Date.now().toString(36) + suffix;
}

type CustomerField = 'name' | 'phone' | 'fee' | 'dueDay';

interface AddCustomerFormProps {
  onAdd: (c: Customer) => void;
  onSaved?: (summary: string) => void;
}

export function AddCustomerForm({ onAdd, onSaved }: AddCustomerFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fee, setFee] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors<CustomerField>>({});

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const monthlyFee = Number(fee);
    const day = Number(dueDay);

    const next: FieldErrors<CustomerField> = {};
    if (cleanName === '') {
      next.name = 'Student name is required.';
    }
    if (!/^(\+?91)?\d{10}$/.test(cleanPhone)) {
      next.phone = 'Parent phone must be a 10-digit mobile number (optionally with +91 / 91).';
    }
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
      next.fee = 'Monthly fee must be a number greater than 0.';
    }
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      next.dueDay = 'Due day must be a whole number from 1 to 28.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    onAdd({
      id: newId('c'),
      name: cleanName,
      parentName: '',
      parentPhone: cleanPhone,
      monthlyFee,
      dueDay: day,
      notes: notes.trim(),
    });
    setName('');
    setPhone('');
    setFee('');
    setDueDay('5');
    setNotes('');
    onSaved?.('Customer added');
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.heading}>Add customer</h3>
      <label style={styles.label}>
        Student name
        <input
          style={styles.input}
          aria-invalid={errors.name !== undefined}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => without(prev, 'name'));
          }}
        />
      </label>
      <FieldMessage message={errors.name} />
      <label style={styles.label}>
        Parent phone
        <input
          style={styles.input}
          type="tel"
          aria-invalid={errors.phone !== undefined}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setErrors((prev) => without(prev, 'phone'));
          }}
        />
      </label>
      <FieldMessage message={errors.phone} />
      <label style={styles.label}>
        Monthly fee (₹)
        <input
          style={styles.input}
          type="number"
          min={0}
          aria-invalid={errors.fee !== undefined}
          value={fee}
          onChange={(e) => {
            setFee(e.target.value);
            setErrors((prev) => without(prev, 'fee'));
          }}
        />
      </label>
      <FieldMessage message={errors.fee} />
      <label style={styles.label}>
        Due day of month (1-28)
        <input
          style={styles.input}
          type="number"
          min={1}
          max={28}
          aria-invalid={errors.dueDay !== undefined}
          value={dueDay}
          onChange={(e) => {
            setDueDay(e.target.value);
            setErrors((prev) => without(prev, 'dueDay'));
          }}
        />
      </label>
      <FieldMessage message={errors.dueDay} />
      <label style={styles.label}>
        Notes (optional)
        <input style={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button type="submit" style={styles.button}>
        Add customer
      </button>
    </form>
  );
}

type InvoiceField = 'customer' | 'amount' | 'dueDate' | 'months';

interface CreateInvoiceFormProps {
  customers: Customer[];
  today: string;
  onAdd: (invs: Invoice[]) => void;
  onSaved?: (summary: string) => void;
  initialCustomerId?: string;
}

export function CreateInvoiceForm({
  customers,
  today,
  onAdd,
  onSaved,
  initialCustomerId,
}: CreateInvoiceFormProps) {
  const preselected = customers.find((c) => c.id === initialCustomerId);
  const initialCustomer = preselected ?? customers[0];
  const [customerId, setCustomerId] = useState(initialCustomer?.id ?? '');
  const [amount, setAmount] = useState(
    initialCustomer !== undefined ? String(initialCustomer.monthlyFee) : '',
  );
  const [dueDate, setDueDate] = useState(
    preselected !== undefined ? nextDueDate(today, preselected.dueDay) : addDays(today, 7),
  );
  const [months, setMonths] = useState('1');
  const [errors, setErrors] = useState<FieldErrors<InvoiceField>>({});

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    setErrors((prev) => without(prev, 'customer'));
    const c = customers.find((cust) => cust.id === id);
    if (c !== undefined) setAmount(String(c.monthlyFee));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(amount);
    const count = Number(months);

    const next: FieldErrors<InvoiceField> = {};
    if (customers.find((c) => c.id === customerId) === undefined) {
      next.customer = 'Pick a customer first.';
    }
    if (!Number.isFinite(value) || value <= 0) {
      next.amount = 'Amount must be greater than 0.';
    }
    if (!ISO_RE.test(dueDate)) {
      next.dueDate = 'Due date is required.';
    }
    if (!Number.isInteger(count) || count < 1) {
      next.months = 'Repeat count must be a whole number of at least 1.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    const invoices: Invoice[] = [];
    for (let i = 0; i < count; i++) {
      invoices.push({
        id: newId('i', `-${i}`),
        customerId,
        amount: value,
        issueDate: today,
        dueDate: addMonths(dueDate, i),
        draft: false,
        payments: [],
      });
    }
    onAdd(invoices);
    setMonths('1');
    onSaved?.(count === 1 ? 'Invoice created' : `${count} invoices created`);
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.heading}>Create invoice</h3>
      <label style={styles.label}>
        Customer
        <select
          style={styles.input}
          aria-invalid={errors.customer !== undefined}
          value={customerId}
          onChange={(e) => handleCustomerChange(e.target.value)}
        >
          {customers.length === 0 && <option value="">No customers yet</option>}
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <FieldMessage message={errors.customer} />
      <label style={styles.label}>
        Amount (₹)
        <input
          style={styles.input}
          type="number"
          min={0}
          aria-invalid={errors.amount !== undefined}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrors((prev) => without(prev, 'amount'));
          }}
        />
      </label>
      <FieldMessage message={errors.amount} />
      <label style={styles.label}>
        Due date
        <input
          style={styles.input}
          type="date"
          aria-invalid={errors.dueDate !== undefined}
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            setErrors((prev) => without(prev, 'dueDate'));
          }}
        />
      </label>
      <FieldMessage message={errors.dueDate} />
      <label style={styles.label}>
        Repeat monthly for N months
        <input
          style={styles.input}
          type="number"
          min={1}
          aria-invalid={errors.months !== undefined}
          value={months}
          onChange={(e) => {
            setMonths(e.target.value);
            setErrors((prev) => without(prev, 'months'));
          }}
        />
      </label>
      <FieldMessage message={errors.months} />
      <button type="submit" style={styles.button}>
        Create invoice
      </button>
    </form>
  );
}

type BillField = 'name' | 'amount' | 'dueDate';

interface AddBillFormProps {
  today: string;
  onAdd: (b: Bill) => void;
  onSaved?: (summary: string) => void;
}

export function AddBillForm({ today, onAdd, onSaved }: AddBillFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<BillCategory>('other');
  const [dueDate, setDueDate] = useState(addDays(today, 7));
  const [recurrence, setRecurrence] = useState<Recurrence>('monthly');
  const [errors, setErrors] = useState<FieldErrors<BillField>>({});

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = name.trim();
    const value = Number(amount);

    const next: FieldErrors<BillField> = {};
    if (cleanName === '') {
      next.name = 'Bill name is required.';
    }
    if (!Number.isFinite(value) || value <= 0) {
      next.amount = 'Amount must be greater than 0.';
    }
    if (!ISO_RE.test(dueDate)) {
      next.dueDate = 'Due date is required.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    onAdd({
      id: newId('b'),
      name: cleanName,
      category,
      amount: value,
      dueDate,
      recurrence,
    });
    setName('');
    setAmount('');
    setDueDate(addDays(today, 7));
    setRecurrence('monthly');
    onSaved?.('Bill added');
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.heading}>Add bill</h3>
      <label style={styles.label}>
        Name
        <input
          style={styles.input}
          aria-invalid={errors.name !== undefined}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => without(prev, 'name'));
          }}
        />
      </label>
      <FieldMessage message={errors.name} />
      <label style={styles.label}>
        Amount (₹)
        <input
          style={styles.input}
          type="number"
          min={0}
          aria-invalid={errors.amount !== undefined}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrors((prev) => without(prev, 'amount'));
          }}
        />
      </label>
      <FieldMessage message={errors.amount} />
      <label style={styles.label}>
        Category
        <select
          style={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value as BillCategory)}
        >
          {BILL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label style={styles.label}>
        Due date
        <input
          style={styles.input}
          type="date"
          aria-invalid={errors.dueDate !== undefined}
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            setErrors((prev) => without(prev, 'dueDate'));
          }}
        />
      </label>
      <FieldMessage message={errors.dueDate} />
      <label style={styles.label}>
        Recurrence
        <select
          style={styles.input}
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as Recurrence)}
        >
          {RECURRENCES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" style={styles.button}>
        Add bill
      </button>
    </form>
  );
}
