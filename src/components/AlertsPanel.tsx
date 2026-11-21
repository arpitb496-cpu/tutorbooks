import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Alert } from '../lib/alerts';

const SEVERITY_STYLE: Record<Alert['severity'], CSSProperties> = {
  high: { background: '#fde8e8', color: '#b42318', border: '1px solid #f5b5b5' },
  medium: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  info: { background: '#e6f0ff', color: '#1d4ed8', border: '1px solid #b3ccf5' },
};

const SEVERITY_LABEL: Record<Alert['severity'], string> = {
  high: 'High',
  medium: 'Medium',
  info: 'Info',
};

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
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderBottom: '1px solid #e4e7eb',
    paddingBottom: 12,
    marginBottom: 12,
  },
  message: { fontSize: 15, margin: 0 },
  badge: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  button: {
    alignSelf: 'flex-start',
    display: 'inline-block',
    padding: '8px 12px',
    fontSize: 14,
    border: 'none',
    borderRadius: 6,
    background: '#1f6feb',
    color: '#fff',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  muted: { color: '#616e7c', fontSize: 14 },
  row: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  secondaryButton: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #1f6feb',
    borderRadius: 6,
    background: '#fff',
    color: '#1f6feb',
    cursor: 'pointer',
  },
};

function scrollTo(target: string) {
  document.getElementById(target)?.scrollIntoView();
}

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyMessage(id: string, text: string) {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
    } else {
      window.prompt('Copy this message:', text);
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Alerts</h2>
      {alerts.length === 0 ? (
        <div style={styles.muted}>No alerts. Nothing needs action today.</div>
      ) : (
        alerts.map((alert) => {
          const action = alert.action;
          return (
            <div key={alert.id} style={styles.item}>
              <span style={{ ...styles.badge, ...SEVERITY_STYLE[alert.severity] }}>
                {SEVERITY_LABEL[alert.severity]}
              </span>
              <p style={styles.message}>{alert.message}</p>
              {action.kind === 'whatsapp' ? (
                <div style={styles.row}>
                  <button
                    type="button"
                    style={styles.button}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Nothing is sent until you press send in WhatsApp. Open WhatsApp now?',
                        )
                      ) {
                        window.open(action.href, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    Send on WhatsApp
                  </button>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => copyMessage(alert.id, action.message)}
                  >
                    Copy message
                  </button>
                  {copiedId === alert.id && <span style={styles.muted}>Copied</span>}
                </div>
              ) : (
                <button
                  type="button"
                  style={styles.button}
                  onClick={() => scrollTo(action.target)}
                >
                  {alert.actionLabel}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
