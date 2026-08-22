import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';

// Import Views
import { Auth } from './views/Auth';
import { Dashboard } from './views/Dashboard';
import { AIChat } from './views/AIChat';
import { ScanCrop } from './views/ScanCrop';
import { GovSchemes } from './views/GovSchemes';
import { MarketPrices } from './views/MarketPrices';
import { WaterManagement } from './views/WaterManagement';
import { FertilizerSchedule } from './views/FertilizerSchedule';
import { Store } from './views/Store';
import { CartView } from './views/CartView';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { LandingPage } from './views/LandingPage';
import { Community } from './views/Community';

// Auth Guard component for protecting private routes
const ProtectedLayout = ({ children }) => {
  const { token } = useApp();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      {/* Dynamic sidebar / mobile bottombar navigation */}
      <Navigation />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

function AppContent() {
  const { token } = useApp();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public login/register routes */}
        <Route path="/login" element={<Auth />} />
        
        {/* Public Landing or Protected Dashboard depending on auth */}
        <Route path="/" element={
          token ? (
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          ) : (
            <LandingPage />
          )
        } />
        <Route path="/ai-assistant" element={
          <ProtectedLayout>
            <AIChat />
          </ProtectedLayout>
        } />
        <Route path="/scan" element={
          <ProtectedLayout>
            <ScanCrop />
          </ProtectedLayout>
        } />
        <Route path="/schemes" element={
          <ProtectedLayout>
            <GovSchemes />
          </ProtectedLayout>
        } />
        <Route path="/market-prices" element={
          <ProtectedLayout>
            <MarketPrices />
          </ProtectedLayout>
        } />
        <Route path="/community" element={
          <ProtectedLayout>
            <Community />
          </ProtectedLayout>
        } />
        <Route path="/water-management" element={
          <ProtectedLayout>
            <WaterManagement />
          </ProtectedLayout>
        } />
        <Route path="/fertilizer-schedule" element={
          <ProtectedLayout>
            <FertilizerSchedule />
          </ProtectedLayout>
        } />
        <Route path="/products" element={
          <ProtectedLayout>
            <Store />
          </ProtectedLayout>
        } />
        <Route path="/cart" element={
          <ProtectedLayout>
            <CartView />
          </ProtectedLayout>
        } />
        <Route path="/notifications" element={
          <ProtectedLayout>
            <NotificationsView />
          </ProtectedLayout>
        } />
        <Route path="/profile" element={
          <ProtectedLayout>
            <ProfileView />
          </ProtectedLayout>
        } />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
