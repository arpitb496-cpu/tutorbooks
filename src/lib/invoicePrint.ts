export interface InvoicePrintInput {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  tutorName: string;
  studentName: string;
  parentName: string;
  amount: number;
  description: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Formats a YYYY-MM-DD string as e.g. "5 Jun 2025". Falls back to the raw input if it does not parse.
function formatDate(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return value;
  if (month < 1 || month > 12) return value;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function formatAmount(amount: number): string {
  return 'Rs. ' + amount.toLocaleString('en-IN');
}

export function invoiceHtml(input: InvoicePrintInput): string {
  const invoiceNumber = escapeHtml(input.invoiceNumber);
  const issueDate = escapeHtml(formatDate(input.issueDate));
  const dueDate = escapeHtml(formatDate(input.dueDate));
  const parentName = escapeHtml(input.parentName);
  const studentName = escapeHtml(input.studentName);
  const tutorName = escapeHtml(input.tutorName);
  const description = escapeHtml(input.description);
  const amount = escapeHtml(formatAmount(input.amount));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${invoiceNumber}</title>
<style>
@page { size: A4; margin: 18mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12pt; }
.page { width: 100%; max-width: 174mm; margin: 0 auto; }
h1 { font-size: 26pt; letter-spacing: 2px; margin: 0 0 8mm 0; text-align: center; }
.tutor { text-align: center; color: #444; margin-bottom: 8mm; }
table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; }
th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ccc; vertical-align: top; }
th { background: #f2f2f2; font-weight: bold; }
td.num, th.num { text-align: right; }
.meta td:first-child { width: 35%; font-weight: bold; color: #333; }
.total td { font-weight: bold; font-size: 13pt; border-top: 2px solid #111; border-bottom: none; }
.footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #ccc; font-size: 11pt; text-align: center; }
</style>
</head>
<body>
<div class="page">
<h1>INVOICE</h1>
<div class="tutor">${tutorName}</div>
<table class="meta">
<tr><td>Invoice number</td><td>${invoiceNumber}</td></tr>
<tr><td>Issue date</td><td>${issueDate}</td></tr>
<tr><td>Due date</td><td>${dueDate}</td></tr>
<tr><td>Bill to</td><td>${parentName} (parent of ${studentName})</td></tr>
</table>
<table>
<thead>
<tr><th>Description</th><th class="num">Amount</th></tr>
</thead>
<tbody>
<tr><td>${description}</td><td class="num">${amount}</td></tr>
<tr class="total"><td>Total</td><td class="num">${amount}</td></tr>
</tbody>
</table>
<div class="footer">Pay by ${dueDate}</div>
</div>
</body>
</html>`;
}

export function openPrintableInvoice(input: InvoicePrintInput): boolean {
  if (typeof window === 'undefined') return false;
  const win = window.open('', '_blank');
  if (win === null) return false;
  win.document.write(invoiceHtml(input));
  win.document.close();
  setTimeout(() => {
    win.print();
  }, 300);
  return true;
}
