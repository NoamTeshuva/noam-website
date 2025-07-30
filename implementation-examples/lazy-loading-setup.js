// App.js - Main routing with lazy loading
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorFallback from './components/common/ErrorFallback';

// Lazy load major components
const Portfolio = lazy(() => import('./Portfolio'));
const BloombergTerminal = lazy(() => 
  import('./pages/Bloomberg/BloombergTerminal').then(module => ({
    default: module.BloombergTerminal
  }))
);
const Login = lazy(() => import('./pages/Auth/Login'));
const CryptoTracker = lazy(() => import('./pages/Crypto/CryptoTracker'));
const NewsCenter = lazy(() => import('./pages/News/NewsCenter'));
const ChartsAnalysis = lazy(() => import('./pages/Charts/ChartsAnalysis'));

// Route-based code splitting
const App = () => {
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback} 
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
        // Send to monitoring service (Sentry)
      }}
    >
      <div className="bg-bloomberg-primary text-white min-h-screen">
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route index element={<Portfolio />} />
              <Route path="login" element={<Login />} />
              <Route
                path="bloomberg/*"
                element={
                  <ProtectedRoute>
                    <BloombergTerminal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="crypto"
                element={
                  <ProtectedRoute>
                    <CryptoTracker />
                  </ProtectedRoute>
                }
              />
              <Route
                path="news"
                element={
                  <ProtectedRoute>
                    <NewsCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="charts"
                element={
                  <ProtectedRoute>
                    <ChartsAnalysis />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </div>
    </ErrorBoundary>
  );
};

// Bloomberg Terminal internal routing
// pages/Bloomberg/BloombergTerminal.js
import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import BloombergHeader from './components/BloombergHeader';
import NavigationTabs from './components/NavigationTabs';

// Feature-based lazy loading
const Dashboard = lazy(() => import('./features/Dashboard/Dashboard'));
const Watchlists = lazy(() => import('./features/Watchlists/Watchlists'));
const MarketAnalysis = lazy(() => import('./features/Analysis/MarketAnalysis'));
const Portfolio = lazy(() => import('./features/Portfolio/Portfolio'));
const NewsAnalysis = lazy(() => import('./features/News/NewsAnalysis'));
const OptionsChain = lazy(() => import('./features/Options/OptionsChain'));

export const BloombergTerminal = () => {
  return (
    <div className="min-h-screen bg-bloomberg-primary">
      <BloombergHeader />
      <NavigationTabs />
      
      <main className="container mx-auto px-4 py-6">
        <Suspense fallback={<FeatureLoadingSpinner />}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="watchlists" element={<Watchlists />} />
            <Route path="analysis" element={<MarketAnalysis />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="news" element={<NewsAnalysis />} />
            <Route path="options" element={<OptionsChain />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

// Component-level lazy loading for heavy features
// features/Charts/ChartingPanel.js
import React, { lazy, Suspense, useState } from 'react';

const TradingViewChart = lazy(() => import('./TradingViewChart'));
const CandlestickChart = lazy(() => import('./CandlestickChart'));
const VolumeAnalysis = lazy(() => import('./VolumeAnalysis'));
const TechnicalIndicators = lazy(() => import('./TechnicalIndicators'));

export const ChartingPanel = ({ symbol, timeframe }) => {
  const [activeChart, setActiveChart] = useState('tradingview');
  
  const renderChart = () => {
    switch (activeChart) {
      case 'tradingview':
        return <TradingViewChart symbol={symbol} timeframe={timeframe} />;
      case 'candlestick':  
        return <CandlestickChart symbol={symbol} timeframe={timeframe} />;
      case 'volume':
        return <VolumeAnalysis symbol={symbol} timeframe={timeframe} />;
      case 'technical':
        return <TechnicalIndicators symbol={symbol} timeframe={timeframe} />;
      default:
        return <TradingViewChart symbol={symbol} timeframe={timeframe} />;
    }
  };

  return (
    <div className="bg-bloomberg-panel rounded-terminal border border-bloomberg-border">
      <div className="flex items-center justify-between p-4 border-b border-bloomberg-border">
        <h3 className="text-bloomberg-orange font-bold">
          {symbol} - {timeframe}
        </h3>
        <div className="flex space-x-2">
          {['tradingview', 'candlestick', 'volume', 'technical'].map(type => (
            <button
              key={type}
              onClick={() => setActiveChart(type)}
              className={`px-3 py-1 rounded-terminal text-xs ${
                activeChart === type
                  ? 'bg-bloomberg-orange text-black'
                  : 'bg-bloomberg-button text-white hover:bg-bloomberg-button-hover'
              }`}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-4 h-96">
        <Suspense fallback={<ChartLoadingSpinner />}>
          {renderChart()}
        </Suspense>
      </div>
    </div>
  );
};

// Bundle analysis webpack config addition
// webpack.config.js (if ejected) or craco.config.js
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add bundle analyzer in development
      if (process.env.NODE_ENV === 'development') {
        const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
        webpackConfig.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            openAnalyzer: false,
          })
        );
      }

      // Optimize chunks
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            bloomberg: {
              test: /[\\/]src[\\/]pages[\\/]Bloomberg[\\/]/,
              name: 'bloomberg',
              chunks: 'all',
            },
            charts: {
              test: /[\\/]src[\\/].*[\\/](Chart|Trading).*[\\/]/,
              name: 'charts',
              chunks: 'all',
            }
          }
        }
      };

      return webpackConfig;
    }
  }
};