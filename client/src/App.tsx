import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Services } from './pages/Services';
import { PrepareOverview } from './pages/PrepareOverview';
import { PrepareDetails } from './pages/PrepareDetails';
import { Documents } from './pages/Documents';
import { Readiness } from './pages/Readiness';
import { Apply } from './pages/Apply';
import { Complete } from './pages/Complete';
import { GovernmentPortalDemo } from './pages/GovernmentPortalDemo';
import { Assistant } from './features/assistant/Assistant';
import { ErrorNotice, LoadingScreen } from './components/ui/Primitives';
import { useApp } from './state/AppContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export function App() {
  const { booting, bootError, retryBoot } = useApp();

  if (bootError) {
    return (
      <Layout>
        <ErrorNotice
          message={bootError.message}
          action={bootError.action}
          onRetry={retryBoot}
        />
      </Layout>
    );
  }

  if (booting) {
    return (
      <Layout>
        <LoadingScreen label="Getting things ready…" />
      </Layout>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/services" element={<Services />} />
          <Route path="/prepare/:serviceId" element={<PrepareOverview />} />
          <Route path="/prepare/:serviceId/details" element={<PrepareDetails />} />
          <Route path="/prepare/:serviceId/documents" element={<Documents />} />
          <Route path="/prepare/:serviceId/readiness" element={<Readiness />} />
          <Route path="/apply/:serviceId" element={<Apply />} />
          <Route path="/complete" element={<Complete />} />
          <Route path="/demo/government-portal" element={<GovernmentPortalDemo />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Assistant />
    </>
  );
}
