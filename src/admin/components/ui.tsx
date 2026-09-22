import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react';

import type { Status } from '../lib/db';

import { Icon, type IconName } from './Icon';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md';
  icon?: IconName;
  loading?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', icon, loading, children, className, disabled, type = 'button', ...rest }: BtnProps) {
  return (
    <button type={type} className={cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)} disabled={disabled || loading} {...rest}>
      {loading ? <span className="spinner spinner-sm" aria-hidden="true" /> : icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, variant = 'ghost', ...rest }: { icon: IconName; label: string; variant?: 'ghost' | 'danger' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx('icon-btn', variant === 'danger' && 'icon-btn-danger')} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={16} />
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="center-block">
      <span className="spinner" aria-hidden="true" />
      {label ? <span className="muted">{label}</span> : null}
    </div>
  );
}

const STATUS_LABEL: Record<Status, string> = { draft: 'Draft', published: 'Published', unpublished: 'Unpublished' };
export function StatusBadge({ status, deleted }: { status?: Status | string | null; deleted?: boolean }) {
  if (deleted) return <span className="badge badge-deleted">Deleted</span>;
  const s = (status ?? 'draft') as Status;
  return <span className={cx('badge', `badge-${s}`)}>{STATUS_LABEL[s] ?? s}</span>;
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet'; children: ReactNode }) {
  return <span className={cx('badge', `badge-${tone}`)}>{children}</span>;
}

export function EmptyState({ icon = 'folder', title, hint, action }: { icon?: IconName; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      {hint ? <p className="muted">{hint}</p> : null}
      {action}
    </div>
  );
}

export function Card({ title, actions, children, className, padded = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx('card', className)}>
      {title || actions ? (
        <header className="card-head">
          <h3>{title}</h3>
          <div className="row gap-sm">{actions}</div>
        </header>
      ) : null}
      <div className={padded ? 'card-body' : undefined}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { label: string; onClick: () => void } }) {
  return (
    <div className="page-head">
      <div>
        {back ? (
          <button type="button" className="back-link" onClick={back.onClick}>
            <Icon name="arrow-back" size={14} /> {back.label}
          </button>
        ) : null}
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="row gap-sm wrap">{actions}</div> : null}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="search">
      <Icon name="search" size={16} />
      <input
        type="search"
        value={local}
        placeholder={placeholder}
        aria-label="Search"
        onChange={(e) => {
          setLocal(e.target.value);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => onChange(e.target.value), 300);
        }}
      />
    </label>
  );
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export function FilterBar({ filters, values, onChange }: { filters: FilterDef[]; values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  return (
    <>
      {filters.map((f) => (
        <label key={f.key} className="filter">
          <span className="sr-only">{f.label}</span>
          <select value={values[f.key] ?? ''} onChange={(e) => onChange(f.key, e.target.value)} aria-label={f.label}>
            <option value="">{f.label}: All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return total ? <div className="pagination muted">{total} item{total === 1 ? '' : 's'}</div> : null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="pagination">
      <span className="muted">
        {from}–{to} of {total}
      </span>
      <div className="row gap-sm">
        <Button size="sm" icon="chevron-left" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page" />
        <span className="muted">
          Page {page + 1} / {pages}
        </span>
        <Button size="sm" icon="chevron-right" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" />
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', wide && 'modal-wide')} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <header className="modal-head">
          <h3>{title}</h3>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Drawer({ open, title, onClose, children }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay overlay-right" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true">
        <header className="modal-head">
          <h3>{title}</h3>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="confirm-message">{message}</div>
    </Modal>
  );
}

export function Field({ label, help, error, required, children, span, htmlFor }: { label?: ReactNode; help?: ReactNode; error?: string | null; required?: boolean; children: ReactNode; span?: 1 | 2; htmlFor?: string }) {
  return (
    <div className={cx('field', span === 2 && 'field-wide', error && 'field-error')}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="req"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <div className="field-msg error">{error}</div> : help ? <div className="field-msg">{help}</div> : null}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx('switch', disabled && 'switch-disabled')}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} className={cx('tab', t.value === value && 'tab-active')} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined ? <span className="tab-count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      icon={done ? 'check-circle' : 'copy'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? 'Copied' : label}
    </Button>
  );
}
