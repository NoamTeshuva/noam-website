const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Development proxy for Twelve Data API via Cloudflare Worker
 * In production, set REACT_APP_WORKER_URL to your deployed worker URL
 */

module.exports = function(app) {
  // Default to deployed worker, or use localhost for testing worker locally
  const workerTarget = process.env.REACT_APP_WORKER_URL || 'https://twelvedata-proxy.teshuva91.workers.dev';

  // Proxy /api/* requests to Cloudflare Worker
  app.use(
    '/api',
    createProxyMiddleware({
      target: workerTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api' // Keep /api prefix
      },
      onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type';
      },
      onError: function(err, req, res) {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
      }
    })
  );
};