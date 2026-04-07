import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from './stores/auth/authStore';
import { authApi } from './api';
import { COLORS } from './constants';
import type { ReactNode } from 'react';

// Lazy load pages
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const LoginPage = lazy(() => import('./pages/login/LoginPage'));
const ScraperPage = lazy(() => import('./pages/scraper/ScraperPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

function PageLoader() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.dark }}>
      <Spin size="large" />
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/scraper" replace /> : <>{children}</>;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const { setAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) { setLoading(false); return; }
    if (window.location.pathname.includes('/login')) { setLoading(false); return; }
    (async () => {
      try {
        const { data: refreshRes } = await authApi.refresh();
        const newToken = refreshRes.data?.access_token;
        if (!newToken) throw new Error('No token');
        useAuthStore.getState().setToken(newToken);
        const { data: profileRes } = await authApi.getProfile();
        const user = profileRes.data;
        if (user) setAuth(user, newToken);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/scraper" element={<ScraperPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/scraper" replace />} />
      </Routes>
    </Suspense>
  );
}
