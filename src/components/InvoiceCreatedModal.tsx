import { useState } from 'react';
import type { CSSProperties } from 'react';
import Modal from './Modal';
import { formatINR } from '../lib/money';
import { openPrintableInvoice } from '../lib/invoicePrint';
import { whatsAppLink } from '../lib/whatsapp';

export interface InvoiceCardData {
  id: string;
  customerName: string;
  parentName: string;
  studentName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  description: string;
  invoiceNumber: string;
  parentPhone: string;
  tutorName: string;
}

interface InvoiceCreatedModalProps {
  invoice: InvoiceCardData;
  onClose: () => void;
  onEditDetails: () => void;
}

const styles: Record<string, CSSProperties> = {
  body: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 },
  amount: { fontSize: 22, fontWeight: 600 },
  muted: { color: '#616e7c', fontSize: 14 },
  row: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  button: {
    display: 'inline-block',
    padding: '10px 14px',
    fontSize: 15,
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
  note: { fontSize: 14, color: '#1f2933', marginTop: 8 },
};

export default function InvoiceCreatedModal({ invoice, onClose, onEditDetails }: InvoiceCreatedModalProps) {
  const [note, setNote] = useState<string | null>(null);
  const amountText = formatINR(invoice.amount);

  function handleDownload() {
    const ok = openPrintableInvoice({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      tutorName: invoice.tutorName,
      studentName: invoice.studentName,
      parentName: invoice.parentName,
      amount: invoice.amount,
      description: invoice.description,
    });
    setNote(
      ok
        ? 'Opens the invoice in a print window. Choose Save as PDF.'
        : 'Pop-up blocked. Allow pop-ups for this site to print the invoice.',
    );
  }

  function handleWhatsApp() {
    if (!window.confirm('Nothing is sent until you press send in WhatsApp. Open WhatsApp now?')) return;
    const message = `Hi ${invoice.parentName}, here is the invoice for ${invoice.studentName}: ${amountText}, due ${invoice.dueDate}. Thank you.`;
    window.open(whatsAppLink(invoice.parentPhone, message), '_blank', 'noopener,noreferrer');
    setNote('Invoice PDF is not attached. Use Download PDF first, then attach the PDF in WhatsApp.');
  }

  return (
    <Modal title="Invoice created" open={true} onClose={onClose}>
      <div style={styles.body}>
        <div style={styles.amount}>{amountText}</div>
        <div>
          <span style={styles.muted}>Customer</span> {invoice.customerName}
        </div>
        <div>
          <span style={styles.muted}>Due date</span> {invoice.dueDate}
        </div>
      </div>
      <div style={styles.row}>
        <button type="button" style={styles.button} onClick={handleDownload}>
          Download PDF
        </button>
        <button type="button" style={styles.secondaryButton} onClick={handleWhatsApp}>
          Send on WhatsApp
        </button>
        <button type="button" style={styles.secondaryButton} onClick={onEditDetails}>
          Edit details
        </button>
      </div>
      {note !== null && (
        <div role="status" style={styles.note}>
          {note}
        </div>
      )}
    </Modal>
  );
}
