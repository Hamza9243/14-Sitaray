import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

const container = document.getElementById('root')!;
const root = createRoot(container);
const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

if (isAdminRoute) {
  document.documentElement.classList.add('admin-root');
  // The CMS dashboard is a separate app: its own providers, styles and bundle — nothing from the child app is loaded.
  void import('./admin/AdminApp').then(({ AdminApp }) => {
    root.render(
      <StrictMode>
        <AdminApp />
      </StrictMode>
    );
  });
} else {
  void import('react-native-gesture-handler')
    .then(() => import('./App'))
    .then(({ App }) => {
      root.render(
        <StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StrictMode>
      );
    });
}
