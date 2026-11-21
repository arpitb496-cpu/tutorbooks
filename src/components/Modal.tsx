import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  boxSizing: 'border-box',
} as const;

const dialogStyle = {
  background: '#fff',
  maxWidth: 480,
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
  borderRadius: 10,
  padding: 16,
  boxSizing: 'border-box',
} as const;

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
} as const;

const closeButtonStyle = {
  border: 'none',
  background: 'transparent',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  padding: '0 4px',
  color: '#1f2933',
} as const;

export default function Modal({ title, open, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc closes the dialog while it is open.
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus the first field on open; restore focus to the previous element on close.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    return () => {
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={dialogStyle}
      >
        <div style={headerStyle}>
          <strong style={{ fontSize: 18 }}>{title}</strong>
          <button type="button" aria-label="Close" style={closeButtonStyle} onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
