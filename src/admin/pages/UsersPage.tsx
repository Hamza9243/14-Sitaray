import { useState } from 'react';

import { EmptyState, PageHeader, Tabs } from '../components/ui';
import { useAuth } from '../lib/auth';

import { AdminsTab } from './users/AdminsTab';
import { AppUsersTab } from './users/AppUsersTab';

export default function UsersPage() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<'admins' | 'users'>('admins');

  if (!isSuperAdmin) return <EmptyState icon="lock" title="Super admins only" hint="Managing admins and viewing app users is limited to super admins." />;

  return (
    <>
      <PageHeader title="Users" subtitle="Who can use the Content Studio, and who has signed up in the app." />
      <Tabs
        tabs={[
          { value: 'admins', label: 'Admins' },
          { value: 'users', label: 'App users' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div style={{ height: 16 }} />
      {tab === 'admins' ? <AdminsTab /> : <AppUsersTab />}
    </>
  );
}
