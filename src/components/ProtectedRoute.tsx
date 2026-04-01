import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../types/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
