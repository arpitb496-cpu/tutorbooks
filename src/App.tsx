import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { AppData, Bill, BillCategory, Customer, Invoice, Payment } from './lib/types';
import { formatINR } from './lib/money';
import { todayISO } from './lib/dates';
import {
  collectedThisMonth,
  daysOverdue,
  dashboardRows,
  invoiceOutstanding,
  totalOutstanding,
} from './lib/ageing';
import type { AgeingBucket } from './lib/ageing';
import { draftReminder } from './lib/reminders';
import type { Tone } from './lib/reminders';
import { whatsAppLink } from './lib/whatsapp';
import { currentUser, emptyData, loadData, loginUser, logout, registerUser, saveData } from './lib/storage';
import { buildSampleData } from './lib/sample';
import ForecastScreen from './components/ForecastScreen';
import AlertsPanel from './components/AlertsPanel';
import { buildAlerts } from './lib/alerts';
import { AddBillForm, AddCustomerForm, CreateInvoiceForm } from './components/Forms';
import Modal from './components/Modal';
import InvoiceCreatedModal from './components/InvoiceCreatedModal';
import type { InvoiceCardData } from './components/InvoiceCreatedModal';

const BUCKET_LABEL: Record<AgeingBucket, string> = {
  current: 'Not due yet',
  '0-7': '0-7 days',
  '8-30': '8-30 days',
  '30+': '30+ days',
};

const CATEGORY_LABEL: Record<BillCategory, string> = {
  rent: 'Rent',
  internet: 'Internet',
  materials: 'Materials',
  other: 'Other',
};

const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: 720,
    margin: '0 auto',
    padding: 16,
    color: '#1f2933',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  card: {
    background: '#fff',
    border: '1px solid #e4e7eb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    boxSizing: 'border-box',
  },
  heading: { fontSize: 18, margin: '0 0 12px' },
  totals: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  totalCard: {
    flex: '1 1 200px',
    background: '#fff',
    border: '1px solid #e4e7eb',
    borderRadius: 10,
    padding: 16,
    boxSizing: 'border-box',
  },
  totalLabel: { fontSize: 13, color: '#616e7c', marginBottom: 4 },
  totalValue: { fontSize: 22, fontWeight: 600 },
  input: {
    width: '100%',
    padding: 10,
    fontSize: 16,
    border: '1px solid #cbd2d9',
    borderRadius: 6,
    boxSizing: 'border-box',
    marginBottom: 10,
  },
  textarea: {
    width: '100%',
    minHeight: 96,
    padding: 10,
    fontSize: 14,
    border: '1px solid #cbd2d9',
    borderRadius: 6,
    boxSizing: 'border-box',
    marginBottom: 10,
    fontFamily: 'inherit',
  },
  button: {
    display: 'inline-block',
    padding: '10px 14px',
    fontSize: 15,
    border: 'none',
    borderRadius: 6,
    background: '#1f6feb',
    color: '#fff',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  secondaryButton: {
    display: 'inline-block',
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #cbd2d9',
    borderRadius: 6,
    background: '#fff',
    color: '#1f2933',
    cursor: 'pointer',
  },
  error: { color: '#b42318', fontSize: 14, marginBottom: 10 },
  muted: { color: '#616e7c', fontSize: 14 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '8px 6px',
    borderBottom: '1px solid #e4e7eb',
    color: '#616e7c',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  td: { textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e4e7eb' },
  item: {
    borderBottom: '1px solid #e4e7eb',
    paddingBottom: 12,
    marginBottom: 12,
  },
  row: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
};

function sortByDueDate<T extends { dueDate: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Next date with day-of-month dueDay on or after today, clamped to the month length. */
function nextDueDate(dueDay: number, today: string): string {
  const [y = 1970, m = 1, d = 1] = today.split('-').map(Number);
  // m is 1-based; use a 0-based month index. Move to next month if today is past dueDay.
  const monthIndex = d > dueDay ? m : m - 1;
  const targetYear = y + Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(Date.UTC(targetYear, targetMonth, day)).toISOString().slice(0, 10);
}

// ---------- Sign-in / sign-up ----------

function AuthForm(props: { onSignedIn: (email: string) => void }) {
  const { onSignedIn } = props;
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === 'signup') {
      const reg = registerUser(email, password);
      if (!reg.ok) {
        setError(reg.error);
        return;
      }
    }
    const res = loginUser(email, password);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSignedIn(res.email);
  }

  const isSignUp = mode === 'signup';

  return (
    <div style={styles.page}>
      <h1 style={{ fontSize: 24, margin: '24px 0 16px' }}>TutorBooks</h1>
      <div style={styles.card}>
        <h2 style={styles.heading}>{isSignUp ? 'Create an account' : 'Sign in'}</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
            Password
            <input
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </label>
          {error !== null && <div style={styles.error}>{error}</div>}
          <div style={styles.row}>
            <button type="submit" style={styles.button}>
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setError(null);
                setMode(isSignUp ? 'signin' : 'signup');
              }}
            >
              {isSignUp ? 'Have an account? Sign in' : 'New here? Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Follow-up reminder for one overdue invoice ----------

function FollowUpCard(props: {
  customerName: string;
  parentPhone: string;
  dueDate: string;
  outstanding: number;
  days: number;
}) {
  const { customerName, parentPhone, dueDate, outstanding, days } = props;
  const [tone, setTone] = useState<Tone>('polite');
  const [text, setText] = useState(() =>
    draftReminder('polite', { customerName, amount: outstanding, dueDate, daysOverdue: days }),
  );

  function changeTone(next: Tone) {
    setTone(next);
    setText(draftReminder(next, { customerName, amount: outstanding, dueDate, daysOverdue: days }));
  }

  return (
    <div style={styles.item}>
      <div style={{ ...styles.row, justifyContent: 'space-between', marginBottom: 6 }}>
        <strong>{customerName}</strong>
        <span style={styles.muted}>
          {formatINR(outstanding)} · due {dueDate} · {days} days overdue
        </span>
      </div>
      <div style={{ ...styles.row, marginBottom: 6 }}>
        <label style={{ fontSize: 14 }}>
          Tone{' '}
          <select value={tone} onChange={(e) => changeTone(e.target.value as Tone)} style={{ fontSize: 14, padding: 4 }}>
            <option value="polite">Polite</option>
            <option value="firm">Firm</option>
            <option value="final">Final</option>
          </select>
        </label>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} style={styles.textarea} />
      <a
        href={whatsAppLink(parentPhone, text)}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.button}
      >
        Send on WhatsApp
      </a>
    </div>
  );
}

// ---------- Record a payment against one open invoice ----------

function PaymentForm(props: { outstanding: number; onRecord: (amount: number) => void }) {
  const { outstanding, onRecord } = props;
  const [amountText, setAmountText] = useState(String(outstanding));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = Number(amountText);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('Enter a whole-rupee amount above 0.');
      return;
    }
    if (amount > outstanding) {
      setError(`Amount cannot exceed the outstanding ${formatINR(outstanding)}.`);
      return;
    }
    setError(null);
    onRecord(amount);
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...styles.row, marginTop: 6 }}>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={outstanding}
        step={1}
        value={amountText}
        onChange={(e) => setAmountText(e.target.value)}
        style={{ ...styles.input, width: 140, marginBottom: 0 }}
        aria-label="Payment amount"
      />
      <button type="submit" style={styles.secondaryButton}>
        Record payment
      </button>
      {error !== null && <div style={{ ...styles.error, width: '100%', marginBottom: 0 }}>{error}</div>}
    </form>
  );
}

// ---------- Main app ----------

export default function App() {
  const [user, setUser] = useState<string | null>(() => currentUser());
  const [data, setData] = useState<AppData>(() => (currentUser() !== null ? loadData() : emptyData()));
  const [openForm, setOpenForm] = useState<'customer' | 'invoice' | 'bill' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState<string | null>(null);
  const [quickInvoice, setQuickInvoice] = useState<InvoiceCardData | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (toast === null) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (lastAddedId === null) return undefined;
    const el = document.getElementById('item-' + lastAddedId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => setLastAddedId(null), 2000);
    return () => window.clearTimeout(timer);
  }, [lastAddedId]);

  if (user === null) {
    return (
      <AuthForm
        onSignedIn={(email) => {
          setData(loadData());
          setUser(email);
        }}
      />
    );
  }

  function commit(next: AppData) {
    setData(next);
    saveData(next);
  }

  function handleLogout() {
    logout();
    setUser(null);
    setData(emptyData());
  }

  function handleLoadSample() {
    commit(buildSampleData(todayISO()));
  }

  function handleResetDemo() {
    if (!window.confirm('This clears all your TutorBooks data and reloads the sample data. Continue?')) return;
    commit(buildSampleData(todayISO()));
  }

  function recordPayment(invoiceId: string, amount: number) {
    const next: AppData = {
      ...data,
      invoices: data.invoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              payments: [
                ...inv.payments,
                { id: `pay-${invoiceId}-${Date.now()}`, amount, date: todayISO() },
              ],
            }
          : inv,
      ),
    };
    commit(next);
    setToast('Payment recorded');
    setLastAddedId(invoiceId);
    setOpenForm(null);
  }

  function toggleForm(kind: 'customer' | 'invoice' | 'bill') {
    setOpenForm((current) => (current === kind ? null : kind));
  }

  function addCustomer(c: Customer) {
    commit({ ...data, customers: [...data.customers, c] });
    setToast('Customer added');
    setLastAddedId(c.id);
    setOpenForm(null);
  }

  function addInvoices(invs: Invoice[]) {
    if (editingInvoiceId !== null) {
      const updated = invs[0];
      if (updated !== undefined) {
        commit({
          ...data,
          invoices: data.invoices.map((inv) =>
            inv.id === editingInvoiceId
              ? { ...inv, customerId: updated.customerId, amount: updated.amount, dueDate: updated.dueDate }
              : inv,
          ),
        });
      }
      setEditingInvoiceId(null);
      setToast('Invoice updated');
      setLastAddedId(editingInvoiceId);
      setOpenForm(null);
      return;
    }
    commit({ ...data, invoices: [...data.invoices, ...invs] });
    setToast(invs.length === 1 ? 'Invoice created' : `${invs.length} invoices created`);
    setLastAddedId(invs[0]?.id ?? null);
    setOpenForm(null);
  }

  function addBill(b: Bill) {
    commit({ ...data, bills: [...data.bills, b] });
    setToast('Bill added');
    setLastAddedId(b.id);
    setOpenForm(null);
  }

  function quickCreate(customer: Customer) {
    const issueDate = todayISO();
    const inv: Invoice = {
      id: 'i' + Date.now().toString(36),
      customerId: customer.id,
      amount: customer.monthlyFee,
      issueDate,
      dueDate: nextDueDate(customer.dueDay, issueDate),
      draft: false,
      payments: [],
    };
    commit({ ...data, invoices: [...data.invoices, inv] });
    setLastAddedId(inv.id);
    setQuickInvoice({
      id: inv.id,
      customerName: customer.name,
      parentName: customer.parentName || customer.name,
      studentName: customer.name,
      amount: inv.amount,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      description: 'Monthly tuition fee',
      invoiceNumber: 'INV-' + inv.id.slice(-6).toUpperCase(),
      parentPhone: customer.parentPhone,
      tutorName: 'TutorBooks',
    });
  }

  const header = (
    <div style={styles.header}>
      <h1 style={{ fontSize: 22, margin: 0 }}>TutorBooks</h1>
      <div style={styles.row}>
        <span style={styles.muted}>{user}</span>
        <button type="button" style={styles.secondaryButton} onClick={handleResetDemo}>
          Reset demo
        </button>
        <button type="button" style={styles.secondaryButton} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );

  const toastView =
    toast === null ? null : (
      <div
        role="status"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1f2933',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: 8,
          fontSize: 14,
          zIndex: 1000,
        }}
      >
        {toast}
      </div>
    );

  if (data.customers.length === 0) {
    return (
      <div style={styles.page}>
        {header}
        {toastView}
        <div style={styles.card}>
          <h2 style={styles.heading}>Welcome. Let's get you set up.</h2>
          <ol style={{ paddingLeft: 20, lineHeight: 1.6, margin: '0 0 16px' }}>
            <li style={{ marginBottom: 12 }}>
              <strong>Load sample data</strong>
              <div>Try TutorBooks with 8 made-up students, invoices and bills.</div>
              <button type="button" style={{ ...styles.button, marginTop: 8 }} onClick={handleLoadSample}>
                Load sample data
              </button>
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong>See who owes you</strong>
              <div>The dashboard lists every unpaid invoice, oldest first, with ageing buckets.</div>
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong>Check the forecast</strong>
              <div>The cash forecast shows your balance for the next 30, 60 and 90 days.</div>
            </li>
          </ol>
          <div style={styles.muted}>Or start with your own data using the Add customer button.</div>
          <button
            type="button"
            style={{ ...styles.secondaryButton, marginTop: 8 }}
            onClick={() => setOpenForm('customer')}
          >
            Add customer
          </button>
          <button
            type="button"
            style={{ ...styles.secondaryButton, marginTop: 8, marginLeft: 8 }}
            onClick={() => setOpenForm('customer')}
          >
            Add a customer first
          </button>
          <Modal title="Add customer" open={openForm === 'customer'} onClose={() => setOpenForm(null)}>
            <AddCustomerForm onAdd={addCustomer} />
          </Modal>
        </div>
      </div>
    );
  }

  const today = todayISO();
  const editingInvoice =
    editingInvoiceId === null ? undefined : data.invoices.find((inv) => inv.id === editingInvoiceId);
  const allPayments: Payment[] = data.invoices.flatMap((inv) => inv.payments);
  const outstanding = totalOutstanding(data.invoices);
  const collected = collectedThisMonth(allPayments, today);
  const rows = dashboardRows(data.customers, data.invoices, allPayments, today);
  const customerById = new Map<string, Customer>(data.customers.map((c) => [c.id, c]));
  const alerts = buildAlerts(data, today);
  const customerOutstanding = (customerId: string): number =>
    data.invoices
      .filter((inv) => inv.customerId === customerId)
      .reduce((sum, inv) => sum + invoiceOutstanding(inv), 0);

  const openInvoices = sortByDueDate(data.invoices.filter((inv) => invoiceOutstanding(inv) > 0));
  const overdueInvoices = openInvoices.filter(
    (inv) => daysOverdue(inv.dueDate, today, invoiceOutstanding(inv)) > 0,
  );

  return (
    <div style={styles.page}>
      {header}
      {toastView}

      <div style={styles.row}>
        <button
          type="button"
          style={openForm === 'customer' ? styles.button : styles.secondaryButton}
          onClick={() => toggleForm('customer')}
        >
          Add customer
        </button>
        <button
          type="button"
          style={openForm === 'invoice' ? styles.button : styles.secondaryButton}
          onClick={() => {
            toggleForm('invoice');
            setInvoiceCustomerId(null);
            setEditingInvoiceId(null);
          }}
        >
          Create invoice
        </button>
        <button
          type="button"
          style={openForm === 'bill' ? styles.button : styles.secondaryButton}
          onClick={() => toggleForm('bill')}
        >
          Add bill
        </button>
      </div>

      <Modal title="Add customer" open={openForm === 'customer'} onClose={() => setOpenForm(null)}>
        <AddCustomerForm onAdd={addCustomer} />
      </Modal>
      <Modal
        title="New invoice"
        open={openForm === 'invoice'}
        onClose={() => {
          setOpenForm(null);
          setEditingInvoiceId(null);
        }}
      >
        <CreateInvoiceForm
          key={editingInvoiceId ?? 'new'}
          customers={data.customers}
          today={today}
          onAdd={addInvoices}
          initialCustomerId={invoiceCustomerId ?? undefined}
          editing={editingInvoice}
        />
      </Modal>
      <Modal title="Add bill" open={openForm === 'bill'} onClose={() => setOpenForm(null)}>
        <AddBillForm today={today} onAdd={addBill} />
      </Modal>
      {quickInvoice !== null && (
        <InvoiceCreatedModal
          invoice={quickInvoice}
          onClose={() => setQuickInvoice(null)}
          onEditDetails={() => {
            const created = data.invoices.find((inv) => inv.id === quickInvoice.id);
            setQuickInvoice(null);
            setEditingInvoiceId(quickInvoice.id);
            if (created !== undefined) {
              setInvoiceCustomerId(created.customerId);
            }
            setOpenForm('invoice');
          }}
        />
      )}

      <div style={styles.totals}>
        <div style={styles.totalCard}>
          <div style={styles.totalLabel}>Total outstanding</div>
          <div style={styles.totalValue}>{formatINR(outstanding)}</div>
        </div>
        <div style={styles.totalCard}>
          <div style={styles.totalLabel}>Collected this month</div>
          <div style={styles.totalValue}>{formatINR(collected)}</div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.heading}>Customers</h2>
        {data.customers.map((c) => {
          const due = customerOutstanding(c.id);
          return (
            <div
              key={c.id}
              id={`item-${c.id}`}
              style={{ ...styles.item, background: lastAddedId === c.id ? '#fff7d6' : undefined }}
            >
              <div style={{ ...styles.row, justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>{c.name}</strong>
                <span style={styles.muted}>
                  {formatINR(c.monthlyFee)} a month · Due day {c.dueDay}
                </span>
              </div>
              <div style={{ ...styles.row, justifyContent: 'space-between' }}>
                <span style={styles.muted}>{due === 0 ? 'All paid' : `Outstanding ${formatINR(due)}`}</span>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => quickCreate(c)}
                >
                  Create invoice
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertsPanel alerts={alerts} />

      <div style={styles.card}>
        <h2 style={styles.heading}>Who owes me</h2>
        {rows.length === 0 ? (
          <div style={styles.muted}>Nobody owes anything right now.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Outstanding</th>
                  <th style={styles.th}>Oldest due</th>
                  <th style={styles.th}>Days overdue</th>
                  <th style={styles.th}>Bucket</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.customerId}>
                    <td style={styles.td}>{r.customerName}</td>
                    <td style={styles.td}>{formatINR(r.outstanding)}</td>
                    <td style={styles.td}>{r.oldestDueDate}</td>
                    <td style={styles.td}>{r.daysOverdue}</td>
                    <td style={styles.td}>{BUCKET_LABEL[r.bucket]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div id="cash-forecast">
        <h2 style={styles.heading}>Cash forecast</h2>
        <ForecastScreen data={data} today={today} />
      </div>

      <div style={styles.card}>
        <h2 style={styles.heading}>Follow-ups</h2>
        {overdueInvoices.length === 0 ? (
          <div style={styles.muted}>No overdue invoices. Nothing to chase.</div>
        ) : (
          overdueInvoices.map((inv) => {
            const customer = customerById.get(inv.customerId);
            if (customer === undefined) return null;
            const open = invoiceOutstanding(inv);
            return (
              <FollowUpCard
                key={`${inv.id}-${open}`}
                customerName={customer.name}
                parentPhone={customer.parentPhone}
                dueDate={inv.dueDate}
                outstanding={open}
                days={daysOverdue(inv.dueDate, today, open)}
              />
            );
          })
        )}
      </div>

      <div id="bills" style={styles.card}>
        <h2 style={styles.heading}>Bills</h2>
        {data.bills.length === 0 ? (
          <div style={styles.muted}>No bills yet.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Bill</th>
                  <th style={styles.th}>Due date</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Category</th>
                </tr>
              </thead>
              <tbody>
                {sortByDueDate(data.bills).map((b) => (
                  <tr key={b.id} id={`item-${b.id}`} style={lastAddedId === b.id ? { background: '#fff7d6' } : undefined}>
                    <td style={styles.td}>{b.name}</td>
                    <td style={styles.td}>{b.dueDate}</td>
                    <td style={styles.td}>{formatINR(b.amount)}</td>
                    <td style={styles.td}>{CATEGORY_LABEL[b.category]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.heading}>Record payment</h2>
        {openInvoices.length === 0 ? (
          <div style={styles.muted}>No open invoices.</div>
        ) : (
          openInvoices.map((inv) => {
            const customer = customerById.get(inv.customerId);
            if (customer === undefined) return null;
            const open = invoiceOutstanding(inv);
            return (
              <div
                key={`${inv.id}-${open}`}
                id={`item-${inv.id}`}
                style={{ ...styles.item, background: lastAddedId === inv.id ? '#fff7d6' : undefined }}
              >
                <div style={{ marginBottom: 4 }}>
                  <strong>{customer.name}</strong>{' '}
                  <span style={styles.muted}>
                    · due {inv.dueDate} · outstanding {formatINR(open)}
                  </span>
                </div>
                <PaymentForm outstanding={open} onRecord={(amount) => recordPayment(inv.id, amount)} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
