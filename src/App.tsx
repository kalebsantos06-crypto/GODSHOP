/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import GuaranteeNote from './pages/GuaranteeNote';
import PriceTable from './pages/PriceTable';
import Settings from './pages/Settings';
import Login from './pages/Login';
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="sales" element={<Sales />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="prices" element={<PriceTable />} />
                <Route path="clients" element={<Clients />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="guarantee/:id" element={<GuaranteeNote />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
