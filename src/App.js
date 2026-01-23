import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Portfolio from './Portfolio';
import BloombergWannabe from './pages/BloombergWannabe';
import BloombergSimple from './pages/BloombergSimple';
import Login from './pages/Login';
import { ToastContainer, useToast } from './components/NotificationToast';
import { useWatchlistStore } from './store/useWatchlistStore';
import { EventDetector, createVolumeSpikeMessage } from './utils/eventDetector';

const API_BASE = process.env.REACT_APP_WORKER_URL || '/api';

// Auth Context for logout functionality
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Verify JWT token with the server
const verifyToken = async (token) => {
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
};

// Check if token is expired (client-side check)
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);

    return payload.exp && payload.exp < now;
  } catch {
    return true;
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = sessionStorage.getItem('authToken');
    const isAuth = sessionStorage.getItem('isAuth') === 'true';
    // Quick client-side check - will be verified with server
    return isAuth && token && !isTokenExpired(token);
  });
  const [isVerifying, setIsVerifying] = useState(true);

  const { toasts, removeToast, toast } = useToast();
  const watchlistStore = useWatchlistStore();

  // Logout function
  const logout = useCallback(() => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('isAuth');
    sessionStorage.removeItem('authUser');
    setIsAuthenticated(false);

    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { isAuthenticated: false }
    }));
  }, []);

  // Verify token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('authToken');

      if (!token || isTokenExpired(token)) {
        logout();
        setIsVerifying(false);
        return;
      }

      // Verify with server
      const isValid = await verifyToken(token);

      if (!isValid) {
        console.log('Token verification failed - logging out');
        logout();
      } else {
        setIsAuthenticated(true);
      }

      setIsVerifying(false);
    };

    checkAuth();
  }, [logout]);

  // Periodic token check (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const token = sessionStorage.getItem('authToken');
      if (isTokenExpired(token)) {
        console.log('Token expired - logging out');
        logout();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);

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
      const token = sessionStorage.getItem('authToken');
      const authState = sessionStorage.getItem('isAuth') === 'true' && token && !isTokenExpired(token);
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

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  console.log('🔒 App render - Auth state:', {
    hasToken: !!sessionStorage.getItem('authToken'),
    isAuthenticated,
    isVerifying,
    path: window.location.pathname
  });

  // Show loading during initial verification
  if (isVerifying) {
    return (
      <div className="bg-bloomberg-primary text-white min-h-screen flex items-center justify-center">
        <div className="text-bloomberg-orange text-lg">Verifying session...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, logout }}>
      <div className="bg-bloomberg-primary text-white min-h-screen">
        <BrowserRouter>
          <Routes>
            <Route index element={<Portfolio />} />
            <Route path="login" element={
              isAuthenticated ? <Navigate to="/bloomberg" replace /> : <Login />
            } />
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
    </AuthContext.Provider>
  );
}

export default App;
