/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Suspense, lazy, ComponentType } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { useAuth } from './types/AuthContext';
import { db } from './services/db';
import { AuthProvider } from './types/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { initRealtimeSync } from './services/realtime';
import { backgroundService } from './services/backgroundService';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Direct static imports for primary boot screens (instant startup with zero 429 rate limit delays)
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Helper to safely lazy load sub-route chunks with auto-retry on network rate limits
function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      // Retry once after 200ms if initial request was rate limited or aborted
      await new Promise((r) => setTimeout(r, 200));
      return componentImport();
    }
  });
}

// Resilient on-demand lazy loading for heavy sub-pages
const Inventory = lazyWithRetry(() => import('./pages/Inventory'));
const Sales = lazyWithRetry(() => import('./pages/Sales'));
const ConsolesStock = lazyWithRetry(() => import('./pages/ConsolesStock'));
const GiftsAndAccessories = lazyWithRetry(() => import('./pages/GiftsAndAccessories'));
const Invoices = lazyWithRetry(() => import('./pages/Invoices'));
const Clients = lazyWithRetry(() => import('./pages/Clients'));
const Suppliers = lazyWithRetry(() => import('./pages/Suppliers'));
const GuaranteeNote = lazyWithRetry(() => import('./pages/GuaranteeNote'));
const PriceTable = lazyWithRetry(() => import('./pages/PriceTable'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const UsersPage = lazyWithRetry(() => import('./pages/Users'));
const Notes = lazyWithRetry(() => import('./pages/Notes'));
const FiscalHub = lazyWithRetry(() => import('./pages/fiscal/FiscalHub'));
const ClientSignature = lazyWithRetry(() => import('./pages/ClientSignature'));
const ClientRemoteRegister = lazyWithRetry(() => import('./pages/ClientRemoteRegister'));

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
  return <LoadingScreen message="Carregando tela..." />;
}

function handleInitialRedirects() {
  if (typeof window === 'undefined') return;
  
  const pathname = window.location.pathname || '';
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  // If hash is already present, do not perform URL rewrites to avoid reload loops
  if (hash && hash.length > 1) {
    return;
  }

  // Safely translate path-based links for client self-registration or client signature into hash routes without page reload
  if (pathname.startsWith('/cadastro-cliente')) {
    window.history.replaceState(null, '', `${window.location.origin}/#/cadastro-cliente${search}`);
    return;
  }
  if (pathname.startsWith('/assinar')) {
    window.history.replaceState(null, '', `${window.location.origin}/#${pathname}${search}`);
    return;
  }
}

// Run initial check once on script parse
handleInitialRedirects();

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Update browser tab title based on current active screen
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'GODSHOP | Dashboard',
      '/inventory': 'GODSHOP | Estoque iPhones',
      '/consoles': 'GODSHOP | Eletrônicos & Consoles',
      '/gifts': 'GODSHOP | Brindes & Acessórios',
      '/sales': 'GODSHOP | Registro de Vendas',
      '/clients': 'GODSHOP | Clientes',
      '/suppliers': 'GODSHOP | Fornecedores',
      '/prices': 'GODSHOP | Tabela de Preços',
      '/notes': 'GODSHOP | Anotações & Áudios',
      '/users': 'GODSHOP | Gestão de Usuários',
      '/settings': 'GODSHOP | Configurações',
      '/fiscal': 'GODSHOP | Módulo Fiscal NF-e',
      '/invoices': 'GODSHOP | Carnês & Boletos',
      '/login': 'GODSHOP | Acesso ao Sistema',
      '/cadastro-cliente': 'GODSHOP | Cadastro de Cliente',
    };

    const path = location.pathname;
    let pageTitle = titles[path];
    if (!pageTitle) {
      if (path.startsWith('/guarantee')) pageTitle = 'GODSHOP | Termo de Garantia';
      else if (path.startsWith('/assinar')) pageTitle = 'GODSHOP | Assinatura Digital';
      else if (path.startsWith('/fiscal')) pageTitle = 'GODSHOP | Módulo Fiscal NF-e';
      else pageTitle = 'GODSHOP - Sistema de Gestão';
    }

    document.title = pageTitle;
  }, [location.pathname]);

  // Ensure fresh app start/restart always opens on Dashboard
  useEffect(() => {
    const isClientStandalone = location.pathname.startsWith('/assinar') || location.pathname.startsWith('/cadastro-cliente');
    if (!isClientStandalone) {
      const sessionStarted = sessionStorage.getItem('godshop_app_session_started');
      if (!sessionStarted) {
        sessionStorage.setItem('godshop_app_session_started', 'true');
        if (location.pathname !== '/' && location.pathname !== '/login') {
          navigate('/', { replace: true });
        }
      }
    }
  }, [location.pathname, navigate]);

  // Initialize Supabase 100% Real-time synchronization
  useEffect(() => {
    const cleanup = initRealtimeSync(queryClient);
    return () => {
      cleanup();
    };
  }, []);

  // Multi-device Cloud Sync & Background Execution Engine (APK & Desktop)
  useEffect(() => {
    let isSubscribed = true;
    let isSyncing = false;

    // Initialize background execution
    backgroundService.init();

    const performSync = async () => {
      if (isSyncing || !isSubscribed) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      isSyncing = true;
      try {
        // 1. Pull latest cloud data so all devices get all saved items immediately
        const pullRes = await db.pullFromCloud();
        if (pullRes.success && pullRes.hasChanged && isSubscribed) {
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          queryClient.invalidateQueries({ queryKey: ['iphones'] });
          queryClient.invalidateQueries({ queryKey: ['consoles'] });
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }

        // 2. Push any local items to cloud so they are never lost
        await db.pushToCloud();
      } catch (err: any) {
        // Handled
      } finally {
        isSyncing = false;
      }
    };

    // Initial sync on app boot
    performSync();

    // Register sync task to run with background keep-alive
    const unregisterBgSync = backgroundService.registerSyncTask(performSync);

    // High-performance background sync interval: 120 seconds
    const interval = setInterval(() => {
      performSync();
    }, 120000);

    // Throttled focus sync (minimum 30s delay between focus syncs)
    let lastFocusSync = 0;
    const handleFocusOrActivity = () => {
      const now = Date.now();
      if (now - lastFocusSync > 30000) {
        performSync();
        lastFocusSync = now;
      }
    };

    window.addEventListener('focus', handleFocusOrActivity);
    window.addEventListener('visibilitychange', handleFocusOrActivity);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      unregisterBgSync();
      window.removeEventListener('focus', handleFocusOrActivity);
      window.removeEventListener('visibilitychange', handleFocusOrActivity);
    };
  }, []);

  // Background Database Warmup (Android APK & Capacitor Safety - Non Blocking)
  useEffect(() => {
    let isMounted = true;

    async function initLocalDatabase() {
      try {
        if (typeof window !== 'undefined') {
          // Pre-warm local storage cache keys for core tables
          ['iphones', 'consoles', 'sales', 'clients', 'suppliers', 'prices'].forEach(table => {
            const key = `db_fallback_${table}`;
            try {
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, '[]');
              }
            } catch (e) {}
          });
        }

        // Background cloud pull with safety race
        const pullPromise = db.pullFromCloud();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
        await Promise.race([pullPromise, timeoutPromise]);
      } catch (err) {
        // Silenced
      }
    }

    initLocalDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<PageLoadingFallback />}>
        <ErrorBoundary>
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
                <Route path="notes" element={<Notes />} />
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
        </ErrorBoundary>
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
