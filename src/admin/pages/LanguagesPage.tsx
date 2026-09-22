import { useState } from 'react';

import { type Column, DataTable } from '../components/DataTable';
import { Badge, Button, Card, IconButton, PageHeader, Switch } from '../components/ui';
import { useAuth } from '../lib/auth';
import { type Language, useLookups } from '../lib/data';

import { LanguageForm } from './languages/LanguageForm';
import { useLanguageOps } from './languages/useLanguageOps';

export default function LanguagesPage() {
  const { isSuperAdmin } = useAuth();
  const { languages, loaded } = useLookups();
  const ops = useLanguageOps();
  const [form, setForm] = useState<{ language: Language | null } | null>(null);

  const columns: Column<Language & { id: string }>[] = [
    { key: 'code', header: 'Code', width: '90px', render: (l) => <code>{l.code}</code> },
    {
      key: 'name',
      header: 'Language',
      render: (l) => (
        <span className="cell-title">
          <strong>{l.name}</strong>
          <span className="muted small" dir={l.direction}>
            {l.native_name}
          </span>
        </span>
      ),
    },
    { key: 'dir', header: 'Direction', width: '110px', render: (l) => <Badge tone={l.direction === 'rtl' ? 'violet' : 'neutral'}>{l.direction.toUpperCase()}</Badge> },
    {
      key: 'enabled',
      header: 'Enabled',
      width: '110px',
      render: (l) => <Switch checked={l.is_enabled} disabled={!isSuperAdmin || ops.busy || l.is_default} onChange={(v) => void ops.toggleEnabled(l, v)} label={<span className="sr-only">{`Enable ${l.name}`}</span>} />,
    },
    { key: 'default', header: 'Default', width: '150px', render: (l) => (l.is_default ? <Badge tone="blue">Default</Badge> : isSuperAdmin ? <Button size="sm" disabled={ops.busy || !l.is_enabled} title={l.is_enabled ? undefined : 'Enable the language first'} onClick={() => ops.requestDefault(l)}>Make default</Button> : null) },
    { key: 'order', header: 'Order', width: '70px', render: (l) => l.sort_order },
    ...(isSuperAdmin
      ? [
          {
            key: 'actions',
            header: '',
            width: '96px',
            align: 'right' as const,
            render: (l: Language) => (
              <span className="row gap-xs end">
                <IconButton icon="edit" label={`Edit ${l.name}`} onClick={() => setForm({ language: l })} />
                <IconButton icon="trash" label={`Delete ${l.name}`} variant="danger" disabled={l.is_default || ops.busy} onClick={() => void ops.requestDelete(l)} />
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Languages"
        subtitle="Languages the app and its content can be translated into."
        actions={
          isSuperAdmin ? (
            <Button variant="primary" icon="add" onClick={() => setForm({ language: null })}>
              Add language
            </Button>
          ) : undefined
        }
      />
      {!isSuperAdmin ? (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          Only super admins can add, edit or remove languages. You can view them here, and translate content into any enabled language from each item’s editor.
        </div>
      ) : null}
      <Card padded={false}>
        <DataTable columns={columns} rows={languages.map((l) => ({ ...l, id: l.code }))} loading={!loaded} empty={{ title: 'No languages yet' }} />
      </Card>
      <p className="muted small">The default language is stored directly on each content item; every other language is stored as a translation of it.</p>
      <LanguageForm open={Boolean(form)} language={form?.language ?? null} onClose={() => setForm(null)} />
      {ops.dialogs}
    </>
  );
}
