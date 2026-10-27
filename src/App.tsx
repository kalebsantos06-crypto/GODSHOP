/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, Suspense } from 'react';
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

// Import all application route pages directly for maximum reliability and zero dynamic chunk loading failures
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import ConsolesStock from './pages/ConsolesStock';
import GiftsAndAccessories from './pages/GiftsAndAccessories';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import GuaranteeNote from './pages/GuaranteeNote';
import PriceTable from './pages/PriceTable';
import Settings from './pages/Settings';
import UsersPage from './pages/Users';
import Notes from './pages/Notes';
import Login from './pages/Login';
import FiscalHub from './pages/fiscal/FiscalHub';
import ClientSignature from './pages/ClientSignature';
import ClientRemoteRegister from './pages/ClientRemoteRegister';

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

    // High-performance background sync interval: 120 seconds
    const interval = setInterval(() => {
      performSync();
    }, 120000);

    // Throttled focus sync (minimum 15s delay between focus syncs)
    let lastFocusSync = 0;
    const handleFocusOrActivity = () => {
      const now = Date.now();
      if (now - lastFocusSync > 15000) {
        performSync();
        lastFocusSync = now;
      }
    };
    
    const handleSyncCompleted = (e: any) => {
      if (e?.detail?.hasChanged && isSubscribed) {
        queryClient.invalidateQueries();
      }
    };

    const handleDeviceMutation = () => {
      if (isSubscribed) {
        performSync();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('db_fallback_') && isSubscribed) {
        queryClient.invalidateQueries();
      }
    };

    window.addEventListener('focus', handleFocusOrActivity);
    window.addEventListener('cloud_sync_completed', handleSyncCompleted);
    window.addEventListener('visibilitychange', handleFocusOrActivity);
    window.addEventListener('device_data_mutated', handleDeviceMutation);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      unregisterBgSync();
      window.removeEventListener('focus', handleFocusOrActivity);
      window.removeEventListener('cloud_sync_completed', handleSyncCompleted);
      window.removeEventListener('visibilitychange', handleFocusOrActivity);
      window.removeEventListener('device_data_mutated', handleDeviceMutation);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated, user?.id]); // Use user.id to avoid unnecessary re-triggers

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
