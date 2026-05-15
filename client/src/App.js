import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Quotations from './pages/Quotations';
import QuotationBuilder from './pages/QuotationBuilder';
import ProductLibrary from './pages/ProductLibrary';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import './App.css';

import axios from 'axios';
import API_BASE from './api/config';

axios.defaults.baseURL = API_BASE;

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } }
});

function ProtectedRoute({ children }) {
  const { token } = useApp();
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { token } = useApp();
  return !token ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { token, user } = useApp();
  const [splashDone, setSplashDone] = useState(() => {
    const shown = sessionStorage.getItem('qf_splash_shown');
    return !!shown || !token;
  });

  const handleSplashDone = () => {
    sessionStorage.setItem('qf_splash_shown', '1');
    setSplashDone(true);
  };

  return (
    <>
      {!splashDone && token && (
        <SplashScreen userName={user?.name || ''} onDone={handleSplashDone} />
      )}
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="quotations" element={<Quotations />} />
          <Route path="quotations/new" element={<QuotationBuilder />} />
          <Route path="quotations/:id/edit" element={<QuotationBuilder />} />
          <Route path="products" element={<ProductLibrary />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
}
