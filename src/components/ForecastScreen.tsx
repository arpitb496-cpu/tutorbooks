import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AppData, ISODate, Payment } from '../lib/types';
import type { DailyPoint, ForecastInput, Scenario } from '../lib/forecast';
import { buildForecast } from '../lib/forecast';
import { formatINR } from '../lib/money';
import { invoiceOutstanding } from '../lib/ageing';

const FORECAST_DAYS = 90;
const HORIZONS = [30, 60, 90] as const;
const DEFAULT_DAYS = 15;
const MIN_DAYS = 1;
const MAX_DAYS = 120;

const styles: Record<string, CSSProperties> = {
  card: {
    background: '#fff',
    border: '1px solid #e4e7eb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    boxSizing: 'border-box',
  },
  heading: { fontSize: 18, margin: '0 0 12px' },
  subheading: { fontSize: 15, margin: '16px 0 8px' },
  muted: { color: '#616e7c', fontSize: 14 },
  row: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  select: { fontSize: 14, padding: 8, border: '1px solid #cbd2d9', borderRadius: 6, minWidth: 160 },
  numberInput: {
    fontSize: 14,
    padding: 8,
    border: '1px solid #cbd2d9',
    borderRadius: 6,
    width: 90,
    boxSizing: 'border-box',
  },
  button: {
    display: 'inline-block',
    padding: '8px 12px',
    fontSize: 14,
    border: 'none',
    borderRadius: 6,
    background: '#1f6feb',
    color: '#fff',
    cursor: 'pointer',
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
  statement: { fontSize: 14, margin: '12px 0 0' },
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
  td: { textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e4e7eb', whiteSpace: 'nowrap' },
};

interface ChartRow {
  date: ISODate;
  baseline: number;
  scenario?: number;
}

function clampDays(text: string): number {
  const n = Number(text);
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(n)));
}

function sumField(daily: DailyPoint[], field: 'receipts' | 'outflows'): number {
  return daily.reduce((total, p) => total + p[field], 0);
}

export default function ForecastScreen({ data, today }: { data: AppData; today: ISODate }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [daysText, setDaysText] = useState(String(DEFAULT_DAYS));
  const [scenario, setScenario] = useState<Scenario | null>(null);

  const payments: Payment[] = data.invoices.flatMap((inv) => inv.payments);
  const base: ForecastInput = {
    today,
    openingBalance: data.openingBalance,
    customers: data.customers,
    invoices: data.invoices,
    payments,
    bills: data.bills,
    days: FORECAST_DAYS,
  };

  const baseline = buildForecast(base);
  const scenarioResult = scenario !== null ? buildForecast({ ...base, scenario }) : null;

  // Only customers with at least one unpaid invoice, largest outstanding first.
  const unpaidCustomers = useMemo(() => {
    const rows: { id: string; name: string; outstanding: number }[] = [];
    for (const c of data.customers) {
      let outstanding = 0;
      for (const inv of data.invoices) {
        if (inv.customerId === c.id) outstanding += invoiceOutstanding(inv);
      }
      if (outstanding > 0) rows.push({ id: c.id, name: c.name, outstanding });
    }
    return rows.sort((a, b) => b.outstanding - a.outstanding);
  }, [data.customers, data.invoices]);

  const effectiveId =
    selectedId !== null && unpaidCustomers.some((c) => c.id === selectedId)
      ? selectedId
      : (unpaidCustomers[0]?.id ?? '');
  const selectedCustomer = data.customers.find((c) => c.id === effectiveId);
  const days = clampDays(daysText);

  const chartRows: ChartRow[] = baseline.daily.map((p, i) => ({
    date: p.date,
    baseline: p.balance,
    scenario: scenarioResult?.daily[i]?.balance,
  }));

  function applyLate() {
    if (effectiveId === '') return;
    setScenario({ kind: 'late', customerId: effectiveId, days });
  }

  function applySkip() {
    if (effectiveId === '') return;
    setScenario({ kind: 'skip', customerId: effectiveId });
  }

  const scenarioName = selectedCustomer?.name ?? 'the customer';

  return (
    <div>
      <div style={styles.card}>
        <h2 style={styles.heading}>Balance over 90 days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartRows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e7eb" />
            <XAxis dataKey="date" minTickGap={40} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={90} tickFormatter={(v: number) => formatINR(v)} />
            <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? formatINR(v) : String(v ?? ''))} />
            <ReferenceLine y={0} stroke="#b42318" />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Baseline"
              stroke="#1f6feb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {scenarioResult !== null && (
              <Line
                type="monotone"
                dataKey="scenario"
                name="Scenario"
                stroke="#b54708"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div style={styles.muted}>
          Solid line: baseline.{scenarioResult !== null ? ' Dashed line: scenario.' : ''}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.heading}>Summary</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Horizon</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Baseline</th>
                {scenarioResult !== null && <th style={styles.th}>Scenario</th>}
                {scenarioResult !== null && <th style={styles.th}>Difference</th>}
              </tr>
            </thead>
            <tbody>
              {HORIZONS.map((h) => {
                const baseBal = baseline.daily[h]?.balance ?? 0;
                const scenBal = scenarioResult?.daily[h]?.balance ?? 0;
                return (
                  <tr key={h}>
                    <td style={styles.td}>{h} days</td>
                    <td style={styles.td}>{baseline.daily[h]?.date ?? ''}</td>
                    <td style={styles.td}>{formatINR(baseBal)}</td>
                    {scenarioResult !== null && <td style={styles.td}>{formatINR(scenBal)}</td>}
                    {scenarioResult !== null && <td style={styles.td}>{formatINR(scenBal - baseBal)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 style={styles.subheading}>Next 90 days</h3>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Baseline</th>
                {scenarioResult !== null && <th style={styles.th}>Scenario</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>Opening balance</td>
                <td style={styles.td}>{formatINR(data.openingBalance)}</td>
                {scenarioResult !== null && <td style={styles.td}>{formatINR(data.openingBalance)}</td>}
              </tr>
              <tr>
                <td style={styles.td}>Expected receipts</td>
                <td style={styles.td}>{formatINR(sumField(baseline.daily, 'receipts'))}</td>
                {scenarioResult !== null && (
                  <td style={styles.td}>{formatINR(sumField(scenarioResult.daily, 'receipts'))}</td>
                )}
              </tr>
              <tr>
                <td style={styles.td}>Bills</td>
                <td style={styles.td}>{formatINR(sumField(baseline.daily, 'outflows'))}</td>
                {scenarioResult !== null && (
                  <td style={styles.td}>{formatINR(sumField(scenarioResult.daily, 'outflows'))}</td>
                )}
              </tr>
              <tr>
                <td style={styles.td}>Lowest balance date</td>
                <td style={styles.td}>
                  {baseline.lowest.date} ({formatINR(baseline.lowest.balance)})
                </td>
                {scenarioResult !== null && (
                  <td style={styles.td}>
                    {scenarioResult.lowest.date} ({formatINR(scenarioResult.lowest.balance)})
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.heading}>What if a customer pays late?</h2>
        {unpaidCustomers.length === 0 ? (
          <div style={styles.muted}>No unpaid invoices, so there is nothing to test.</div>
        ) : (
          <>
            <div style={{ ...styles.row, marginBottom: 10 }}>
              <label style={{ fontSize: 14 }}>
                Customer{' '}
                <select
                  value={effectiveId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={styles.select}
                >
                  {unpaidCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 14 }}>
                Days late{' '}
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_DAYS}
                  max={MAX_DAYS}
                  step={1}
                  value={daysText}
                  onChange={(e) => setDaysText(e.target.value)}
                  style={styles.numberInput}
                />
              </label>
            </div>
            <div style={styles.row}>
              <button type="button" style={styles.button} onClick={applyLate} disabled={effectiveId === ''}>
                Apply: pays {days} days late
              </button>
              <button type="button" style={styles.secondaryButton} onClick={applySkip} disabled={effectiveId === ''}>
                Skip next payment
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setScenario(null)}
                disabled={scenario === null}
              >
                Clear scenario
              </button>
            </div>

            {scenarioResult !== null && (
              <div style={styles.statement}>
                <div>
                  {scenario?.kind === 'late'
                    ? `${scenarioName} pays ${scenario.days} days late.`
                    : `${scenarioName}'s next payment is skipped.`}
                </div>
                <div>
                  Before: lowest balance {formatINR(baseline.lowest.balance)} on {baseline.lowest.date}
                </div>
                <div>
                  After: lowest balance {formatINR(scenarioResult.lowest.balance)} on {scenarioResult.lowest.date}
                </div>
                <div>
                  Change in lowest balance:{' '}
                  {formatINR(scenarioResult.lowest.balance - baseline.lowest.balance)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
