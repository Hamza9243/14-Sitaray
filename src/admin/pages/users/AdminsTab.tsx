import { useCallback, useEffect, useState } from 'react';

import { type Column, DataTable } from '../../components/DataTable';
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal } from '../../components/ui';
import { type AdminRole, useAuth } from '../../lib/auth';
import { db, friendlyError, listRows, type Row, rpc, unwrap } from '../../lib/db';
import { formatDate } from '../../lib/format';
import { useToast } from '../../lib/toast';

const ROLE_LABEL: Record<string, string> = { super_admin: 'Super admin', content_admin: 'Content admin' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="muted">—</span>;
  return <Badge tone={role === 'super_admin' ? 'violet' : 'blue'}>{ROLE_LABEL[role] ?? role}</Badge>;
}

function AddAdminDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('content_admin');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail('');
      setRole('content_admin');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await rpc('add_admin', { p_email: email.trim(), p_role: role });
      toast.success(`${email.trim()} is now ${ROLE_LABEL[role].toLowerCase()}.`);
      onAdded();
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Add admin"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void submit()}>
            Add admin
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="alert alert-info">The person must already have an account in Supabase Auth (Authentication → Users). Adding them here only grants admin access.</div>
        <Field label="Email" required error={error}>
          <input className="input" type="email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void submit()} placeholder="name@example.com" autoFocus />
        </Field>
        <Field label="Role" help="Content admins edit content. Super admins can also manage users, languages, settings and permanently delete.">
          <select className="select" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            <option value="content_admin">Content admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

export function AdminsTab() {
  const toast = useToast();
  const { admin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: found } = await listRows('admin_users', { softDelete: false, pageSize: 200, order: [{ column: 'created_at', ascending: true }] });
      setRows(found);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const superCount = rows.filter((r) => r.role === 'super_admin').length;
  const isLastSuper = (r: Row) => r.role === 'super_admin' && superCount <= 1;

  const changeRole = async (r: Row, role: string) => {
    if (role === r.role) return;
    if (isLastSuper(r)) {
      toast.error('This is the last super admin. Make someone else a super admin first.');
      return;
    }
    setBusy(true);
    try {
      await unwrap(db().from('admin_users').update({ role }).eq('id', r.id).select('id').single());
      toast.success(`${r.email} is now ${ROLE_LABEL[role].toLowerCase()}.`);
      await load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      const { data, error: err } = await db().from('admin_users').delete().eq('id', removing.id).select('id');
      if (err) throw err;
      if (!data?.length) throw { code: '42501', message: 'permission denied' };
      toast.success(`${removing.email} is no longer an admin.`);
      setRemoving(null);
      await load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Row>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (r) => (
        <span>
          {r.email} {r.auth_user_id === admin?.auth_user_id ? <Badge tone="green">You</Badge> : null}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '210px',
      render: (r) => (
        <span className="row gap-sm">
          <RoleBadge role={r.role} />
          <select className="select" style={{ width: 'auto', minHeight: 30, padding: '3px 8px' }} aria-label={`Role for ${r.email}`} value={r.role} disabled={busy} onChange={(e) => void changeRole(r, e.target.value)}>
            <option value="content_admin">Content admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </span>
      ),
    },
    { key: 'added', header: 'Added', width: '130px', render: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: '',
      width: '60px',
      align: 'right',
      render: (r) => {
        const self = r.auth_user_id === admin?.auth_user_id;
        const label = self ? 'You cannot remove yourself' : isLastSuper(r) ? 'Cannot remove the last super admin' : `Remove ${r.email}`;
        return <IconButton icon="trash" label={label} variant="danger" disabled={busy || self || isLastSuper(r)} onClick={() => setRemoving(r)} />;
      },
    },
  ];

  return (
    <>
      <Card
        title="Admins"
        padded={false}
        actions={
          <Button variant="primary" size="sm" icon="add" onClick={() => setAdding(true)}>
            Add admin
          </Button>
        }
      >
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}{' '}
            <Button size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : null}
        <DataTable columns={columns} rows={rows} loading={loading} empty={{ title: 'No admins found' }} />
      </Card>
      <AddAdminDialog open={adding} onClose={() => setAdding(false)} onAdded={() => void load()} />
      <ConfirmDialog
        open={Boolean(removing)}
        danger
        title="Remove admin?"
        message={<>{removing?.email} will lose access to the Content Studio immediately. Their account itself is not deleted.</>}
        confirmLabel="Remove admin"
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
