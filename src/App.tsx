/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { useAuth } from './types/AuthContext';
import { db } from './services/db';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import ConsolesStock from './pages/ConsolesStock';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import GuaranteeNote from './pages/GuaranteeNote';
import PriceTable from './pages/PriceTable';
import Settings from './pages/Settings';
import UsersPage from './pages/Users';
import Login from './pages/Login';
import ClientSignature from './pages/ClientSignature';
import ClientRemoteRegister from './pages/ClientRemoteRegister';
import { AuthProvider } from './types/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { initRealtimeSync } from './services/realtime';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function checkAndRedirectPublicUrls(): boolean {
  if (typeof window === 'undefined') return false;
  
  const pathname = window.location.pathname;
  const search = window.location.search;
  const hash = window.location.hash;

  // Check if opening a public standalone page
  const isPublicPage = 
    hash.includes('cadastro-cliente') || 
    hash.includes('assinar') || 
    pathname.includes('cadastro-cliente') || 
    pathname.includes('assinar') ||
    search.includes('token') ||
    search.includes('assinatura');

  if (!isPublicPage) {
    // Force starting on Dashboard (/#/) whenever page is reloaded or opened fresh
    if (!hash || hash === '#' || hash !== '#/') {
      window.location.hash = '#/';
    }
  }

  if (!hash) {
    const origin = window.location.origin;
    
    // Direct path-based links like /cadastro-cliente or /assinar/123
    if (pathname && pathname !== '/' && pathname !== '/index.html') {
      window.location.replace(`${origin}/#${pathname}${search}`);
      return true;
    } 
    
    // Query param links like /?token=xyz or /?assinatura=123
    if (search) {
      const params = new URLSearchParams(search);
      const token = params.get('token');
      const assinatura = params.get('assinatura') || params.get('id');
      if (token) {
        window.location.replace(`${origin}/#/cadastro-cliente?token=${token}`);
        return true;
      }
      if (assinatura) {
        window.location.replace(`${origin}/#/assinar/${assinatura}`);
        return true;
      }
    }
  }
  return false;
}

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

  useEffect(() => {
    if (isAuthenticated && user) {
      // Trigger background sync when user logs in or app starts authenticated
      db.syncAll().then(res => {
        if (res.stats && res.stats.synced > 0) {
          console.log(`Auto-sync background: ${res.stats.synced} items synced.`);
          // Invalidate queries to refresh UI with synced data
          queryClient.invalidateQueries();
        }
      }).catch(err => {
        console.warn('Auto-sync background silent fail (likely already in sync or offline):', err.message);
      });
    }
  }, [isAuthenticated, user]);

  if (assinarId) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <ClientSignature id={assinarId} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/assinar/:id" element={<ClientSignature />} />
        <Route path="/cadastro-cliente" element={<ClientRemoteRegister />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="consoles" element={<ConsolesStock />} />
            <Route path="sales" element={<Sales />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="prices" element={<PriceTable />} />
            <Route path="clients" element={<Clients />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="guarantee/:id" element={<GuaranteeNote />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const isRedirecting = checkAndRedirectPublicUrls();

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-medium text-slate-300">Redirecionando para o portal seguro...</p>
      </div>
    );
  }

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
