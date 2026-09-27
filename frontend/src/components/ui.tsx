'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type NoticeProps = {
  tone: 'info' | 'success' | 'error' | 'warning';
  title: string;
  description: string;
  onDismiss?: () => void;
  className?: string;
};

export function Notice({ tone, title, description, onDismiss, className }: NoticeProps) {
  return (
    <div className={`notice notice-${tone}${className ? ` ${className}` : ''}`}>
      <div className="notice-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="notice-close"
          onClick={onDismiss}
          aria-label="Cerrar mensaje"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {help ? <span className="field-help">{help}</span> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p className="muted">{description}</p>
    </div>
  );
}

export function AdminToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  resultLabel,
  primaryAction,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  resultLabel: string;
  primaryAction?: ReactNode;
}) {
  return (
    <section className="admin-toolbar">
      <div className="admin-toolbar-search">
        <label htmlFor="admin-search" className="admin-toolbar-label">
          Buscar
        </label>
        <input
          id="admin-search"
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </div>
      <div className="admin-toolbar-meta">
        <span className="admin-results-count">{resultLabel}</span>
        {primaryAction}
      </div>
    </section>
  );
}

export function AdminTableEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="table-empty-state">
      <strong>{title}</strong>
      <p className="muted">{description}</p>
      {action ? <div className="button-row">{action}</div> : null}
    </div>
  );
}

export function AdminDrawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'medium',
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'short' | 'medium' | 'wide';
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className={`admin-drawer admin-drawer-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-drawer-header">
          <div>
            <h2 id="admin-drawer-title">{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>
        <div className="admin-drawer-body">{children}</div>
        {footer ? <footer className="admin-drawer-footer">{footer}</footer> : null}
      </aside>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h3 id="dialog-title">{title}</h3>
        <p className="muted">{description}</p>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
