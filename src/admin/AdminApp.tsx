import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';

import './admin.css';
import { AdminLayout } from './components/Layout';
import { EmptyState, Spinner } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import { LookupsProvider } from './lib/data';
import { ToastProvider } from './lib/toast';
import { AccessDeniedPage, ForgotPasswordPage, LoginPage, ResetPasswordPage, SetupPage } from './pages/AuthPages';
import { ResourceEditor } from './pages/ResourceEditor';
import { ResourceList } from './pages/ResourceList';
import { RESOURCE_BY_KEY } from './resources/defs';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StarsPage = lazy(() => import('./pages/StarsPage'));
const DailyStarPage = lazy(() => import('./pages/DailyStarPage'));
const MediaLibraryPage = lazy(() => import('./pages/MediaLibraryPage'));
const LanguagesPage = lazy(() => import('./pages/LanguagesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));

/** Not signed in → login · signed in but not an admin → access denied · admin → the dashboard. */
function RequireAdmin() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <div className="fullscreen"><Spinner label="Loading…" /></div>;
  if (status === 'unconfigured') return <Navigate to="/admin/setup" replace />;
  if (status === 'signed-out') return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  if (status === 'not-admin') return <Navigate to="/admin/access-denied" replace />;
  return (
    <LookupsProvider>
      <AdminLayout />
    </LookupsProvider>
  );
}

function RequireSuperAdmin() {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <EmptyState icon="lock" title="Super admins only" hint="Ask a super admin if you need access to this page." />;
  return <Outlet />;
}

function ResourceRoute({ mode }: { mode: 'list' | 'edit' }) {
  const { key } = useParams();
  const def = key ? RESOURCE_BY_KEY[key] : undefined;
  if (!def) return <EmptyState icon="alert" title="Page not found" hint="That section does not exist." />;
  return mode === 'list' ? <ResourceList def={def} key={def.key} /> : <ResourceEditor def={def} key={`${def.key}-${window.location.pathname}`} />;
}

export function AdminApp() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<div className="fullscreen"><Spinner label="Loading…" /></div>}>
            <Routes>
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin/access-denied" element={<AccessDeniedPage />} />
              <Route path="/admin/setup" element={<SetupPage />} />

              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route path="/admin/stars" element={<StarsPage />} />
                <Route path="/admin/daily-star" element={<DailyStarPage />} />
                <Route path="/admin/media" element={<MediaLibraryPage />} />
                <Route path="/admin/languages" element={<LanguagesPage />} />
                <Route path="/admin/activity" element={<ActivityLogPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route element={<RequireSuperAdmin />}>
                  <Route path="/admin/users" element={<UsersPage />} />
                </Route>
                <Route path="/admin/:key" element={<ResourceRoute mode="list" />} />
                <Route path="/admin/:key/new" element={<ResourceRoute mode="edit" />} />
                <Route path="/admin/:key/:id" element={<ResourceRoute mode="edit" />} />
              </Route>
              <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default AdminApp;
