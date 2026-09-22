import { Link } from 'react-router-dom';

import { Badge, Card, Field, Switch } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useLookups } from '../../lib/data';
import { useLanguageOps } from '../languages/useLanguageOps';

export function LanguageCard() {
  const { isSuperAdmin } = useAuth();
  const { languages, defaultLanguage } = useLookups();
  const ops = useLanguageOps();

  return (
    <Card title="Languages" actions={<Link to="/admin/languages">Manage languages</Link>}>
      <div className="stack">
        <Field label="Default language" help="Content columns hold this language’s text; other languages are stored as translations.">
          <select
            className="select"
            aria-label="Default language"
            value={defaultLanguage}
            disabled={!isSuperAdmin || ops.busy}
            onChange={(e) => {
              const next = languages.find((l) => l.code === e.target.value);
              if (next && !next.is_default) ops.requestDefault(next);
            }}
          >
            {languages.filter((l) => l.is_enabled || l.is_default).map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        </Field>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>
            Supported languages
          </div>
          <ul className="settings-langs">
            {languages.map((l) => (
              <li key={l.code}>
                <span>
                  {l.name} <span className="muted small">({l.code})</span> {l.is_default ? <Badge tone="blue">Default</Badge> : null}
                </span>
                <Switch checked={l.is_enabled} disabled={!isSuperAdmin || ops.busy || l.is_default} onChange={(v) => void ops.toggleEnabled(l, v)} label={<span className="sr-only">{`Enable ${l.name}`}</span>} />
              </li>
            ))}
          </ul>
        </div>
        {!isSuperAdmin ? <p className="muted small">Only super admins can change languages.</p> : null}
      </div>
      {ops.dialogs}
    </Card>
  );
}
