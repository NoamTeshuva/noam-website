import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Portfolio from './Portfolio';
import BloombergWannabe from './pages/BloombergWannabe';
import BloombergSimple from './pages/BloombergSimple';
import Login from './pages/Login';
import { ToastContainer, useToast } from './components/NotificationToast';
import { useWatchlistStore } from './store/useWatchlistStore';
import { EventDetector, createVolumeSpikeMessage } from './utils/eventDetector';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('isAuth') === 'true'
  );

  const { toasts, removeToast, toast } = useToast();
  const watchlistStore = useWatchlistStore();

  // Initialize event detector
  useEffect(() => {
    if (isAuthenticated) {
      const eventDetector = new EventDetector(
        { getState: () => watchlistStore },
        (eventData) => {
          // Handle volume spike notifications
          const message = createVolumeSpikeMessage(eventData);
          toast.volumeSpike(message, {
            duration: 8000 // Longer duration for important alerts
          });
        }
      );

      // Start monitoring every 15 minutes
      eventDetector.start(15);

      return () => {
        eventDetector.stop();
      };
    }
  }, [isAuthenticated, watchlistStore, toast]);

  // Listen for storage changes to update auth state
  useEffect(() => {
    const handleStorageChange = () => {
      const authState = sessionStorage.getItem('isAuth') === 'true';
      console.log('🔄 Storage changed, new auth state:', authState);
      setIsAuthenticated(authState);
    };

    // Listen for custom auth state change events (immediate update)
    const handleAuthStateChange = (event) => {
      const authState = event.detail.isAuthenticated;
      console.log('🔄 Auth state changed (custom event):', authState);
      setIsAuthenticated(authState);
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom auth state change events
    window.addEventListener('authStateChanged', handleAuthStateChange);

    // Also check periodically since sessionStorage events don't fire in same tab
    const interval = setInterval(() => {
      const currentAuth = sessionStorage.getItem('isAuth') === 'true';
      if (currentAuth !== isAuthenticated) {
        console.log('🔄 Auth state changed (polling):', currentAuth);
        setIsAuthenticated(currentAuth);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  console.log('🔒 App render - Auth state:', { 
    sessionStorage: sessionStorage.getItem('isAuth'), 
    isAuthenticated,
    path: window.location.pathname
  });

  return (
    <div className="bg-bloomberg-primary text-white min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route index element={<Portfolio />} />
          <Route path="login" element={<Login />} />
          <Route
            path="bloomberg"
            element={
              isAuthenticated
                ? <BloombergSimple />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="bloomberg-full"
            element={
              isAuthenticated
                ? <BloombergWannabe />
                : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </BrowserRouter>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
