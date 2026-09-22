import { useState } from 'react';

import { Badge, Button, Card, Field } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

export function ProfileCard() {
  const toast = useToast();
  const { admin, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setError(null);
    setSaving(true);
    const res = await updatePassword(password);
    setSaving(false);
    if (res.ok) {
      toast.success('Password updated.');
      setPassword('');
      setConfirm('');
    } else setError(res.error);
  };

  return (
    <Card title="Admin profile">
      <div className="stack">
        <div className="settings-facts">
          <div>
            <span className="muted small">Email</span>
            <div>{admin?.email}</div>
          </div>
          <div>
            <span className="muted small">Role</span>
            <div>
              <Badge tone={admin?.role === 'super_admin' ? 'violet' : 'blue'}>{admin?.role === 'super_admin' ? 'Super admin' : 'Content admin'}</Badge>
            </div>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field label="New password" help="At least 8 characters.">
            <input className="input" type="password" autoComplete="new-password" aria-label="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password" error={error}>
            <input className="input" type="password" autoComplete="new-password" aria-label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <div>
            <Button type="submit" variant="primary" loading={saving} disabled={!password && !confirm}>
              Change password
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
