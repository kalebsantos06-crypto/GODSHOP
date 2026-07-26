/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { HashRouter, Routes, Route, useSearchParams } from 'react-router-dom';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const assinarId = searchParams.get('assinatura') || new URLSearchParams(window.location.search).get('assinatura');
  const legacyToken = new URLSearchParams(window.location.search).get('token');

  // Handle legacy remote register links
  if (legacyToken && window.location.pathname === '/cadastro-cliente') {
    window.location.href = `${window.location.origin}/#/cadastro-cliente?token=${legacyToken}`;
    return null;
  }
  
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
      </Routes>
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
