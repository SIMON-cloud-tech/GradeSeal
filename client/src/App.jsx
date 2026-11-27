// src/App.jsx

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts and Auth
import Auth from './Dashboard/jsx/Auth.jsx';
import Dashboard from './Dashboard/jsx/Dashboard.jsx';
import PrintQueueDetailPage from './Dashboard/jsx/PrintQueueDetailPage.jsx';
import VerifyPage from './Dashboard/jsx/VerifyPage.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if the user is already logged in when the app loads
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return <div className="dashboard-status">Loading...</div>;

  return (
    <Routes>
      {/* 1. PUBLIC LOGIN ROUTE */}
      <Route 
        path="/admin" 
        element={
          user ? <Navigate to="/dashboard" replace /> : <Auth setUser={setUser} />
        } 
      />

      {/* 2. PROTECTED DASHBOARD ROUTES */}
      <Route 
        path="/dashboard/*" 
        element={
          user ? <Dashboard setUser={setUser} /> : <Navigate to="/admin" replace />
        } 
      />
      
      <Route 
        path="/dashboard/print-queue/:coaId" 
        element={
          user ? <PrintQueueDetailPage /> : <Navigate to="/admin" replace />
        } 
      />
      
      <Route 
        path="/dashboard/verify" 
        element={
          user ? <VerifyPage /> : <Navigate to="/admin" replace />
        } 
      />

      {/* 3. CATCH-ALL */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/admin"} replace />} />
    </Routes>
  );
}

export default App;