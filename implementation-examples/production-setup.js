// Production Setup: Auth0 + Monitoring + Error Handling

// 1. Auth0 Integration
// src/auth/auth0-config.js
import { Auth0Provider } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';

const Auth0Config = {
  domain: process.env.REACT_APP_AUTH0_DOMAIN,
  clientId: process.env.REACT_APP_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: process.env.REACT_APP_AUTH0_AUDIENCE,
    scope: 'openid profile email read:market_data manage:watchlists'
  },
  cacheLocation: 'localstorage',
  useRefreshTokens: true
};

export const AuthProvider = ({ children }) => (
  <Auth0Provider {...Auth0Config}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </Auth0Provider>
);

// src/hooks/useAuth.js
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    loginWithRedirect,
    logout,
    getAccessTokenSilently
  } = useAuth0();

  const setUser = useAuthStore(state => state.setUser);
  const clearUser = useAuthStore(state => state.clearUser);

  useEffect(() => {
    if (isAuthenticated && user) {
      setUser({
        id: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        permissions: user['https://bloomberg-terminal/permissions'] || []
      });
    } else {
      clearUser();
    }
  }, [isAuthenticated, user, setUser, clearUser]);

  const getToken = async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Token retrieval failed:', error);
      throw error;
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: loginWithRedirect,
    logout: () => logout({ returnTo: window.location.origin }),
    getToken
  };
};

// Protected Route Component
// src/components/auth/ProtectedRoute.js
import React from 'react';
import { withAuthenticationRequired } from '@auth0/auth0-react';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const { user } = useAuth();
  
  // Check permissions
  if (requiredPermissions.length > 0) {
    const userPermissions = user?.permissions || [];
    const hasRequiredPermissions = requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );
    
    if (!hasRequiredPermissions) {
      return (
        <div className="min-h-screen bg-bloomberg-primary flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-bloomberg-orange text-2xl mb-4">Access Denied</h2>
            <p className="text-bloomberg-text-secondary">
              You don't have permission to access this feature.
            </p>
          </div>
        </div>
      );
    }
  }
  
  return children;
};

export default withAuthenticationRequired(ProtectedRoute, {
  onRedirecting: () => <LoadingSpinner message="Authenticating..." />
});

// 2. Sentry Error Monitoring
// src/monitoring/sentry-config.js
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.REACT_APP_ENVIRONMENT || 'development',
    integrations: [
      new BrowserTracing({
        // Performance monitoring
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
    ],
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out development errors
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      
      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error?.message?.includes('Non-Error promise rejection')) {
        return null;
      }
      
      return event;
    },
    
    // Release tracking
    release: process.env.REACT_APP_VERSION,
    
    // User context
    initialScope: {
      tags: {
        component: 'bloomberg-terminal'
      }
    }
  });
};

// Error Boundary with Sentry
// src/components/error/SentryErrorBoundary.js
import React from 'react';
import * as Sentry from '@sentry/react';

class SentryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'error-boundary');
      scope.setLevel('error');
      scope.setContext('errorInfo', errorInfo);
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bloomberg-primary flex items-center justify-center">
          <div className="bg-bloomberg-panel p-8 rounded-terminal border border-bloomberg-status-error">
            <div className="text-center">
              <h2 className="text-bloomberg-status-error text-2xl font-bold mb-4">
                Terminal Error
              </h2>
              <p className="text-bloomberg-text-secondary mb-6">
                Something went wrong with the Bloomberg terminal. 
                Our team has been notified.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-bloomberg-orange text-black px-6 py-2 rounded-terminal font-bold hover:bg-bloomberg-orange-bright transition-colors"
              >
                Reload Terminal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default Sentry.withErrorBoundary(SentryErrorBoundary);

// 3. Performance Monitoring
// src/monitoring/performance.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import * as Sentry from '@sentry/react';

// Custom performance metrics
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.initWebVitals();
    this.initCustomMetrics();
  }

  initWebVitals() {
    // Core Web Vitals
    getCLS(this.sendToAnalytics);
    getFID(this.sendToAnalytics);
    getFCP(this.sendToAnalytics);
    getLCP(this.sendToAnalytics);
    getTTFB(this.sendToAnalytics);
  }

  initCustomMetrics() {
    // Bloomberg-specific metrics
    this.trackWebSocketLatency();
    this.trackQuoteUpdateFrequency();
    this.trackRenderPerformance();
  }

  sendToAnalytics = (metric) => {
    // Send to multiple analytics services
    this.sendToSentry(metric);
    this.sendToGoogleAnalytics(metric);
    this.logMetric(metric);
  };

  sendToSentry(metric) {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${metric.name}: ${metric.value}`,
      level: 'info',
      data: metric
    });
  }

  sendToGoogleAnalytics(metric) {
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true
      });
    }
  }

  logMetric(metric) {
    console.log(`📊 Performance: ${metric.name} = ${metric.value}`);
  }

  // Custom Bloomberg metrics
  trackWebSocketLatency() {
    const startTime = performance.now();
    
    // Monitor WebSocket message roundtrip
    const originalSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(data) {
      const sendTime = performance.now();
      this.addEventListener('message', function handler(event) {
        const latency = performance.now() - sendTime;
        performanceMonitor.recordCustomMetric('websocket_latency', latency);
        this.removeEventListener('message', handler);
      }, { once: true });
      
      return originalSend.call(this, data);
    };
  }

  trackQuoteUpdateFrequency() {
    let updateCount = 0;
    const startTime = Date.now();
    
    // Monitor quote update frequency
    const observer = new MutationObserver(() => {
      updateCount++;
    });
    
    // Observe quote containers
    const quoteContainer = document.querySelector('[data-testid="quotes-container"]');
    if (quoteContainer) {
      observer.observe(quoteContainer, { childList: true, subtree: true });
    }
    
    // Report frequency every minute
    setInterval(() => {
      const frequency = updateCount / ((Date.now() - startTime) / 1000 / 60);
      this.recordCustomMetric('quote_update_frequency', frequency);
      updateCount = 0;
    }, 60000);
  }

  trackRenderPerformance() {
    // Monitor component render times
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('bloomberg')) {
          this.recordCustomMetric('component_render_time', entry.duration);
        }
      }
    });
    
    observer.observe({ entryTypes: ['measure'] });
  }

  recordCustomMetric(name, value) {
    this.metrics.set(name, value);
    
    // Send to Sentry
    Sentry.addBreadcrumb({
      category: 'custom-performance',
      message: `${name}: ${value}`,
      level: 'info'
    });
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// 4. Health Check System
// src/monitoring/health-check.js
class HealthCheckSystem {
  constructor() {
    this.checks = new Map();
    this.status = 'healthy';
    this.initChecks();
  }

  initChecks() {
    // API Health Checks
    this.addCheck('finnhub_api', this.checkFinnhubAPI);
    this.addCheck('alphavantage_api', this.checkAlphaVantageAPI);
    this.addCheck('websocket_connection', this.checkWebSocketConnection);
    this.addCheck('auth_service', this.checkAuthService);
    
    // Run checks every 5 minutes
    setInterval(() => this.runAllChecks(), 5 * 60 * 1000);
    
    // Initial check
    this.runAllChecks();
  }

  addCheck(name, checkFunction) {
    this.checks.set(name, {
      name,
      check: checkFunction,
      status: 'unknown',
      lastCheck: null,
      error: null
    });
  }

  async runAllChecks() {
    const results = await Promise.allSettled(
      Array.from(this.checks.entries()).map(async ([name, check]) => {
        try {
          const result = await check.check();
          this.checks.set(name, {
            ...check,
            status: result.status,
            lastCheck: Date.now(),
            error: null,
            details: result.details
          });
          return { name, status: result.status };
        } catch (error) {
          this.checks.set(name, {
            ...check,
            status: 'unhealthy',
            lastCheck: Date.now(),
            error: error.message
          });
          return { name, status: 'unhealthy', error: error.message };
        }
      })
    );

    this.updateOverallStatus(results);
    this.reportStatus();
  }

  async checkFinnhubAPI() {
    const response = await fetch('https://finnhub.io/api/v1/quote?symbol=AAPL&token=demo');
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      details: { statusCode: response.status }
    };
  }

  async checkAlphaVantageAPI() {
    const response = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=demo');
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      details: { statusCode: response.status }
    };
  }

  async checkWebSocketConnection() {
    const wsStore = useMarketStore.getState();
    const isConnected = Object.values(wsStore.connections).some(status => status === 'connected');
    
    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      details: { connections: wsStore.connections }
    };
  }

  async checkAuthService() {
    try {
      const { isAuthenticated } = useAuth();
      return {
        status: 'healthy',
        details: { authenticated: isAuthenticated }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }

  updateOverallStatus(results) {
    const unhealthyCount = results.filter(r => r.value?.status === 'unhealthy').length;
    
    if (unhealthyCount === 0) {
      this.status = 'healthy';
    } else if (unhealthyCount < results.length / 2) {
      this.status = 'degraded';
    } else {
      this.status = 'unhealthy';
    }
  }

  reportStatus() {
    const statusData = {
      overall: this.status,
      checks: Object.fromEntries(this.checks),
      timestamp: Date.now()
    };

    // Log to console
    console.log('🏥 Health Check:', statusData);

    // Send to monitoring
    Sentry.addBreadcrumb({
      category: 'health-check',
      message: `Overall status: ${this.status}`,
      level: this.status === 'healthy' ? 'info' : 'warning',
      data: statusData
    });

    // Update UI health indicator
    this.updateHealthIndicator(statusData);
  }

  updateHealthIndicator(statusData) {
    const indicator = document.querySelector('[data-testid="health-indicator"]');
    if (indicator) {
      indicator.className = `health-indicator ${statusData.overall}`;
      indicator.title = `System Status: ${statusData.overall}`;
    }
  }

  getStatus() {
    return {
      overall: this.status,
      checks: Object.fromEntries(this.checks),
      timestamp: Date.now()
    };
  }
}

export const healthCheck = new HealthCheckSystem();

// 5. Feature Flags System
// src/features/feature-flags.js
class FeatureFlagManager {
  constructor() {
    this.flags = new Map();
    this.initDefaultFlags();
    this.loadRemoteFlags();
  }

  initDefaultFlags() {
    this.flags.set('websocket_streaming', true);
    this.flags.set('crypto_trading', false);
    this.flags.set('options_chain', false);
    this.flags.set('news_sentiment', true);
    this.flags.set('portfolio_tracking', false);
    this.flags.set('dark_mode', true);
  }

  async loadRemoteFlags() {
    try {
      // Load from remote config service
      const response = await fetch('/api/feature-flags');
      const remoteFlags = await response.json();
      
      Object.entries(remoteFlags).forEach(([key, value]) => {
        this.flags.set(key, value);
      });
    } catch (error) {
      console.warn('Failed to load remote feature flags:', error);
    }
  }

  isEnabled(flagName) {
    return this.flags.get(flagName) || false;
  }

  enable(flagName) {
    this.flags.set(flagName, true);
  }

  disable(flagName) {
    this.flags.set(flagName, false);
  }

  getAllFlags() {
    return Object.fromEntries(this.flags);
  }
}

export const featureFlags = new FeatureFlagManager();

// React hook for feature flags
export const useFeatureFlag = (flagName) => {
  const [isEnabled, setIsEnabled] = React.useState(
    () => featureFlags.isEnabled(flagName)
  );

  React.useEffect(() => {
    const checkFlag = () => setIsEnabled(featureFlags.isEnabled(flagName));
    
    // Check periodically for remote updates
    const interval = setInterval(checkFlag, 30000);
    return () => clearInterval(interval);
  }, [flagName]);

  return isEnabled;
};