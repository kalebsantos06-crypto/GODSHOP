/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, lazy, Suspense } from 'react';
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

// Resilient dynamic page loader: auto-retries on network drop or dev server refresh
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      const errorMsg = String(error?.message || error || '').toLowerCase();
      if (
        errorMsg.includes('failed to fetch') ||
        errorMsg.includes('dynamically imported module') ||
        error?.name === 'TypeError'
      ) {
        console.warn('[lazyWithRetry] Module import failed, retrying...', error);
        await new Promise((resolve) => setTimeout(resolve, 350));
        try {
          return await factory();
        } catch (retryErr) {
          console.error('[lazyWithRetry] Second attempt failed, refreshing page for fresh chunks...', retryErr);
          const lastReload = sessionStorage.getItem('last_dyn_import_reload');
          const now = Date.now();
          if (!lastReload || now - Number(lastReload) > 10000) {
            sessionStorage.setItem('last_dyn_import_reload', String(now));
            window.location.reload();
            return new Promise(() => {});
          }
          throw retryErr;
        }
      }
      throw error;
    }
  });
}

// Lazy load route pages with retry protection
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
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
const OfferTagGenerator = lazyWithRetry(() => import('./pages/OfferTagGenerator'));
const Notes = lazyWithRetry(() => import('./pages/Notes'));
const Login = lazyWithRetry(() => import('./pages/Login'));
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
  
  const pathname = window.location.pathname || '';
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  // Direct path-based links for client self-registration or client signature only
  if (pathname.startsWith('/cadastro-cliente')) {
    window.location.replace(`${window.location.origin}/#/cadastro-cliente${search}`);
    return;
  }
  if (pathname.startsWith('/assinar')) {
    window.location.replace(`${window.location.origin}/#${pathname}${search}`);
    return;
  }

  // Preserve public standalone client links
  if (hash.startsWith('#/cadastro-cliente') || hash.startsWith('#/assinar/')) {
    return;
  }

  // On cold start/restart, always reset internal sub-routes (such as guarantee note) back to Dashboard
  if (hash.startsWith('#/guarantee') || hash.startsWith('#/invoices')) {
    window.location.hash = '/';
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
      '/offer-tags': 'GODSHOP | Encartes & Tags',
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

    // Initialize background execution and listeners
    backgroundService.init();

    const performSync = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        // 1. Pull latest cloud data so all devices get all saved items immediately
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

    // Register sync task to run with background keep-alive
    const unregisterBgSync = backgroundService.registerSyncTask(performSync);

    // Fast polling interval: syncs every 60 seconds in foreground or background
    const interval = setInterval(() => {
      performSync();
    }, 60000);

    // Sync immediately when user switches tabs, clicks window, or unlocks their phone (throttled)
    let lastFocusSync = 0;
    const handleFocusOrActivity = () => {
      const now = Date.now();
      if (now - lastFocusSync > 30000) { // Only sync if at least 30s passed
        performSync();
        lastFocusSync = now;
      }
    };
    
    const handleSyncCompleted = (e: any) => {
      if (e?.detail?.hasChanged && isSubscribed) {
        queryClient.invalidateQueries();
      }
    };

    window.addEventListener('focus', handleFocusOrActivity);
    window.addEventListener('cloud_sync_completed', handleSyncCompleted);
    window.addEventListener('visibilitychange', handleFocusOrActivity);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      unregisterBgSync();
      window.removeEventListener('focus', handleFocusOrActivity);
      window.removeEventListener('cloud_sync_completed', handleSyncCompleted);
      window.removeEventListener('visibilitychange', handleFocusOrActivity);
    };
  }, [isAuthenticated, user]);

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
              <Route path="notes" element={<Notes />} />
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
