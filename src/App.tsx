/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { useAuth } from './types/AuthContext';
import { db } from './services/db';
import { AuthProvider } from './types/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { initRealtimeSync } from './services/realtime';

// Lazy load route pages for maximum startup performance & minimal memory usage
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Sales = lazy(() => import('./pages/Sales'));
const ConsolesStock = lazy(() => import('./pages/ConsolesStock'));
const GiftsAndAccessories = lazy(() => import('./pages/GiftsAndAccessories'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Clients = lazy(() => import('./pages/Clients'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const GuaranteeNote = lazy(() => import('./pages/GuaranteeNote'));
const PriceTable = lazy(() => import('./pages/PriceTable'));
const Settings = lazy(() => import('./pages/Settings'));
const UsersPage = lazy(() => import('./pages/Users'));
const OfferTagGenerator = lazy(() => import('./pages/OfferTagGenerator'));
const Login = lazy(() => import('./pages/Login'));
const FiscalHub = lazy(() => import('./pages/fiscal/FiscalHub'));
const ClientSignature = lazy(() => import('./pages/ClientSignature'));
const ClientRemoteRegister = lazy(() => import('./pages/ClientRemoteRegister'));

// High performance Query Client configuration with intelligent caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: 'always',
      staleTime: 3 * 60 * 1000, // 3 minutes stale time for snappy tab switching
      gcTime: 15 * 60 * 1000,    // 15 minutes garbage collection time
      retry: 1,
    },
  },
});

// Lightweight instant loading placeholder
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <span className="text-xs font-medium text-muted-foreground tracking-wide">Carregando tela...</span>
      </div>
    </div>
  );
}

function handleInitialRedirects() {
  if (typeof window === 'undefined') return;
  
  const pathname = window.location.pathname;
  const search = window.location.search;
  const hash = window.location.hash;

  // Direct path-based links like /cadastro-cliente or /assinar/123
  if (pathname && pathname !== '/' && pathname !== '/index.html') {
    window.location.replace(`${window.location.origin}/#${pathname}${search}`);
    return;
  }

  // Query param links like /?token=xyz or /?assinatura=123
  if (search && (!hash || hash === '#/' || hash === '#')) {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    const assinatura = params.get('assinatura') || params.get('id');
    if (token) {
      window.location.replace(`${window.location.origin}/#/cadastro-cliente?token=${token}`);
      return;
    }
    if (assinatura) {
      window.location.replace(`${window.location.origin}/#/assinar/${assinatura}`);
      return;
    }
  }
}

// Run initial check once on script parse
handleInitialRedirects();

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const assinarId = searchParams.get('assinatura') || new URLSearchParams(window.location.search).get('assinatura');

  // Initialize Supabase 100% Real-time synchronization
  useEffect(() => {
    const cleanup = initRealtimeSync(queryClient);
    return () => {
      cleanup();
    };
  }, []);

  // Multi-device Cloud Sync: automated background synchronization across all devices
  useEffect(() => {
    let isSubscribed = true;

    const performSync = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        // 1. Pull latest cloud data so new devices get all saved items immediately
        const pullRes = await db.pullFromCloud();
        if (pullRes.success && isSubscribed) {
          if (pullRes.hasChanged) {
            queryClient.invalidateQueries();
          }
        }

        // 2. Push any local items to cloud so they are never lost
        await db.pushToCloud();
      } catch (err: any) {
        // Handled silently
      }
    };

    // Initial sync on app boot
    performSync();

    // Fast polling interval: syncs every 12 seconds in background when online and active
    const interval = setInterval(() => {
      performSync();
    }, 12000);

    // Sync immediately when user switches tabs, clicks window, or unlocks their phone
    const handleFocusOrActivity = () => {
      performSync();
    };
    
    const handleSyncCompleted = (e: any) => {
      if (e?.detail?.hasChanged && isSubscribed) {
        queryClient.invalidateQueries();
      }
    };

    window.addEventListener('focus', handleFocusOrActivity);
    window.addEventListener('cloud_sync_completed', handleSyncCompleted);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    });

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrActivity);
      window.removeEventListener('cloud_sync_completed', handleSyncCompleted);
    };
  }, [isAuthenticated, user]);

  if (assinarId) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Toaster position="top-right" richColors />
        <ClientSignature id={assinarId} />
      </Suspense>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/assinar/:id" element={<ClientSignature />} />
          <Route path="/cadastro-cliente" element={<ClientRemoteRegister />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="consoles" element={<ConsolesStock />} />
              <Route path="gifts" element={<GiftsAndAccessories />} />
              <Route path="sales" element={<Sales />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="prices" element={<PriceTable />} />
              <Route path="offer-tags" element={<OfferTagGenerator />} />
              <Route path="clients" element={<Clients />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<Settings />} />
              <Route path="guarantee/:id" element={<GuaranteeNote />} />

              {/* Fiscal Module Route */}
              <Route path="fiscal" element={<FiscalHub />} />
              <Route path="fiscal/*" element={<FiscalHub />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
}
