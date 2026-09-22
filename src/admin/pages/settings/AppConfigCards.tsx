import { useEffect, useState } from 'react';

import { Button, Card, Field, Switch } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useLookups } from '../../lib/data';
import { friendlyError } from '../../lib/db';
import { useToast } from '../../lib/toast';

import { saveSetting } from './saveSetting';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AppConfigCard() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const { settings, reload } = useLookups();
  const cfg = settings.app_config ?? {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [maintenance, setMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(cfg.app_name ?? '');
    setEmail(cfg.support_email ?? '');
    setMaintenance(Boolean(cfg.maintenance_mode));
  }, [cfg.app_name, cfg.support_email, cfg.maintenance_mode]);

  const save = async () => {
    if (email.trim() && !EMAIL_RE.test(email.trim())) return setError('Enter a valid support email, or leave it empty.');
    setError(null);
    setSaving(true);
    try {
      await saveSetting('app_config', { ...cfg, app_name: name.trim(), support_email: email.trim(), maintenance_mode: maintenance }, true);
      await reload();
      toast.success('App configuration saved.');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="App configuration">
      <div className="stack">
        <div className="form-grid">
          <Field label="App name">
            <input className="input" aria-label="App name" value={name} disabled={!isSuperAdmin} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Support email" error={error}>
            <input className="input" type="email" aria-label="Support email" value={email} disabled={!isSuperAdmin} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Field help="When on, the child app can show a “back soon” message instead of content. These values are public.">
          <Switch checked={maintenance} disabled={!isSuperAdmin} onChange={setMaintenance} label="Maintenance mode" />
        </Field>
        {isSuperAdmin ? (
          <div>
            <Button variant="primary" loading={saving} onClick={() => void save()}>
              Save configuration
            </Button>
          </div>
        ) : (
          <p className="muted small">Only super admins can change the app configuration.</p>
        )}
      </div>
    </Card>
  );
}

export function PublishingCard() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const { settings, reload } = useLookups();
  const cfg = settings.publishing ?? {};
  const [confirmFirst, setConfirmFirst] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setConfirmFirst(Boolean(cfg.confirm_before_publish)), [cfg.confirm_before_publish]);

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('publishing', { ...cfg, confirm_before_publish: confirmFirst }, false);
      await reload();
      toast.success('Publishing settings saved.');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Content publishing">
      <div className="stack">
        <Field help="Editors are asked to confirm before content goes live in the app.">
          <Switch checked={confirmFirst} disabled={!isSuperAdmin} onChange={setConfirmFirst} label="Ask for confirmation before publishing" />
        </Field>
        {isSuperAdmin ? (
          <div>
            <Button variant="primary" loading={saving} onClick={() => void save()}>
              Save publishing settings
            </Button>
          </div>
        ) : (
          <p className="muted small">Only super admins can change publishing settings.</p>
        )}
      </div>
    </Card>
  );
}
