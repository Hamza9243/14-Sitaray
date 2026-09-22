import { PageHeader } from '../components/ui';

import { AppConfigCard, PublishingCard } from './settings/AppConfigCards';
import { LanguageCard } from './settings/LanguageCard';
import { ProfileCard } from './settings/ProfileCard';
import { StorageCard } from './settings/StorageCard';

import './dashboard/dashboard.css';
import './settings/settings.css';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and how the Content Studio and app behave." />
      <div className="settings-grid">
        <div className="settings-col">
          <ProfileCard />
          <LanguageCard />
          <PublishingCard />
        </div>
        <div className="settings-col">
          <AppConfigCard />
          <StorageCard />
        </div>
      </div>
    </>
  );
}
