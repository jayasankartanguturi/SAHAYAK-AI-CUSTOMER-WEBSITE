import React, { Suspense, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import AuthModal from './components/AuthModal';
import WelcomeAuthGate from './components/WelcomeAuthGate';
import LoginSuccessOverlay from './components/ui/LoginSuccessOverlay';
import Breadcrumbs from './components/ui/Breadcrumbs';
import LoadingState from './components/ui/LoadingState';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { APP_ROUTES } from './routes/routeConfig';

function DashboardShell() {
  const { user, accessibility, loginSuccessVisible, t } = useApp();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (!user.isAuthenticated) {
    return (
      <>
        <WelcomeAuthGate />
        <LoginSuccessOverlay visible={loginSuccessVisible} />
      </>
    );
  }

  const fontSizeClass =
    accessibility.fontSize === 'large'
      ? 'text-[16px]'
      : accessibility.fontSize === 'small'
      ? 'text-[13px]'
      : '';

  return (
    <div
      className={`min-h-screen flex bg-[#F1EEFA]/80 text-[#171638] ${fontSizeClass} ${
        accessibility.highContrast ? 'high-contrast' : ''
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-[#7650E8] focus:text-white focus:text-[12.5px] focus:font-semibold"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onOpenAuthModal={() => setAuthModalOpen(true)} />
        <main id="main-content" className="flex-1 px-2.5 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="max-w-[1280px] mx-auto">
            <Breadcrumbs />
            <ErrorBoundary>
              <Suspense fallback={<LoadingState message={t('common.loading')} />}>
                <Routes>
                  {APP_ROUTES.map(({ path, Component }) => (
                    <Route key={path} path={path} element={<Component />} />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <footer className="px-6 py-3 text-center text-[11.5px] text-[#85839A] border-t border-[#ECEAF6]/70">
          {t('brand.footer')}
        </footer>
      </div>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <LoginSuccessOverlay visible={loginSuccessVisible} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DashboardShell />
    </AppProvider>
  );
}
