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

function newId(prefix: string, suffix = ''): string {
  return prefix + Date.now().toString(36) + suffix;
}

interface AddCustomerFormProps {
  onAdd: (c: Customer) => void;
}

export function AddCustomerForm({ onAdd }: AddCustomerFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fee, setFee] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const monthlyFee = Number(fee);
    const day = Number(dueDay);

    if (cleanName === '') {
      setError('Student name is required.');
      return;
    }
    if (!/^(\+?91)?\d{10}$/.test(cleanPhone)) {
      setError('Parent phone must be a 10-digit mobile number (optionally with +91 / 91).');
      return;
    }
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
      setError('Monthly fee must be a number greater than 0.');
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      setError('Due day must be a whole number from 1 to 28.');
      return;
    }

    setError('');
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
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.heading}>Add customer</h3>
      <label style={styles.label}>
        Student name
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={styles.label}>
        Parent phone
        <input style={styles.input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label style={styles.label}>
        Monthly fee (₹)
        <input
          style={styles.input}
          type="number"
          min={0}
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
      </label>
      <label style={styles.label}>
        Due day of month (1-28)
        <input
          style={styles.input}
          type="number"
          min={1}
          max={28}
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
        />
      </label>
      <label style={styles.label}>
        Notes (optional)
        <input style={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error !== '' && <div style={styles.error}>{error}</div>}
      <button type="submit" style={styles.button}>
        Add customer
      </button>
    </form>
  );
}

interface CreateInvoiceFormProps {
  customers: Customer[];
  today: string;
  onAdd: (invs: Invoice[]) => void;
}

export function CreateInvoiceForm({ customers, today, onAdd }: CreateInvoiceFormProps) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [amount, setAmount] = useState(
    customers[0] !== undefined ? String(customers[0].monthlyFee) : '',
  );
  const [dueDate, setDueDate] = useState(addDays(today, 7));
  const [months, setMonths] = useState('1');
  const [error, setError] = useState('');

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    const c = customers.find((cust) => cust.id === id);
    if (c !== undefined) setAmount(String(c.monthlyFee));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(amount);
    const count = Number(months);

    if (customers.find((c) => c.id === customerId) === undefined) {
      setError('Pick a customer first.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!ISO_RE.test(dueDate)) {
      setError('Due date is required.');
      return;
    }
    if (!Number.isInteger(count) || count < 1) {
      setError('Repeat count must be a whole number of at least 1.');
      return;
    }

    setError('');
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
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.heading}>Create invoice</h3>
      <label style={styles.label}>
        Customer
        <select
          style={styles.input}
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
      <label style={styles.label}>
        Amount (₹)
        <input
          style={styles.input}
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label style={styles.label}>
        Due date
        <input
          style={styles.input}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>
      <label style={styles.label}>
        Repeat monthly for N months
        <input
          style={styles.input}
          type="number"
          min={1}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
        />
      </label>
      {error !== '' && <div style={styles.error}>{error}</div>}
      <button type="submit" style={styles.button}>
        Create invoice
      </button>
    </form>
  );
}

interface AddBillFormProps {
  today: string;
  onAdd: (b: Bill) => void;
}

export function AddBillForm({ today, onAdd }: AddBillFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<BillCategory>('other');
  const [dueDate, setDueDate] = useState(addDays(today, 7));
  const [recurrence, setRecurrence] = useState<Recurrence>('monthly');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = name.trim();
    const value = Number(amount);

    if (cleanName === '') {
      setError('Bill name is required.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!ISO_RE.test(dueDate)) {
      setError('Due date is required.');
      return;
    }

    setError('');
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
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.heading}>Add bill</h3>
      <label style={styles.label}>
        Name
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={styles.label}>
        Amount (₹)
        <input
          style={styles.input}
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
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
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>
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
      {error !== '' && <div style={styles.error}>{error}</div>}
      <button type="submit" style={styles.button}>
        Add bill
      </button>
    </form>
  );
}
