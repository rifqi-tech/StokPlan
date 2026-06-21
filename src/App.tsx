import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { StokProvider, useStok } from './context/StokContext';
import Dashboard from './pages/Dashboard';
import Barang from './pages/Barang';
import TambahBarang from './pages/TambahBarang';
import Riwayat from './pages/Riwayat';
import Login from './pages/Login';
import { LayoutDashboard, Package, History } from 'lucide-react';
import './App.css';

const AppContent: React.FC = () => {
  const { user, loading } = useStok();

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: '100vh', justifyContent: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: 600 }}>Menyiapkan Aplikasi...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        
        {/* Main App Routes */}
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/barang" element={<Barang />} />
              <Route path="/barang/baru" element={<TambahBarang />} />
              <Route path="/riwayat" element={<Riwayat />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          )}
        </Routes>

        {/* Premium Bottom Navigation */}
        {user && (
          <nav className="bottom-nav">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard />
              <span>Dashboard</span>
            </NavLink>

            <NavLink 
              to="/barang" 
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Package />
              <span>Barang</span>
            </NavLink>

            <NavLink 
              to="/riwayat" 
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <History />
              <span>Riwayat</span>
            </NavLink>
          </nav>
        )}
        
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <StokProvider>
      <AppContent />
    </StokProvider>
  );
};

export default App;
