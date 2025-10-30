# Financial Market Terminal

A real-time financial market monitoring application with Bloomberg-style interface, technical analysis, and intelligent rate limit management.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![React](https://img.shields.io/badge/React-18.x-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

### Real-Time Market Data
- **Live Stock Quotes**: Real-time price updates during market hours (9:30 AM - 4:00 PM ET)
- **Smart Polling**: Dynamic refresh intervals (1min when open, 30min when closed)
- **Volume Analysis**: Relative volume (RVOL) tracking and spike detection
- **Watchlist Management**: Monitor up to 10 symbols simultaneously

### Technical Analysis
- **RSI (14)**: Relative Strength Index with overbought/oversold indicators
- **MACD (12,26,9)**: Moving Average Convergence Divergence with signal line
- **ATR (14)**: Average True Range for volatility measurement
- **52-Week Range**: Visual percentile tracking with current position
- **Dollar Volume**: Real-time trading volume in dollars

### Company Intelligence
- **Peer Discovery**: Automatic peer company identification using Finnhub
- **Peer Comparison**: Live quotes for 4-5 related companies
- **Sector Analysis**: Industry and sector classification

### Rate Limit Management
- **Global Exhaustion Handling**: Stops all API calls when rate limit reached
- **Cached Data Fallback**: Shows last known data with clear indicators
- **Automatic Midnight Reset**: Resumes at midnight ET when limits reset
- **Visual Indicators**: Yellow warnings show when using cached data
- **Test Mode**: Built-in testing tools for development

### Bloomberg-Style UI
- **Dark Theme**: Professional trading terminal aesthetic
- **Monospace Fonts**: Clear data presentation
- **Color-Coded Metrics**: Green/red for gains/losses
- **Tab Navigation**: Overview, Analysis, News (planned), Chart (planned)
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ and npm
- Cloudflare account (for API proxy)
- Twelve Data API key (free tier: 8 req/min)
- Finnhub API key (optional, for peer data)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NoamTeshuva/noam-website.git
   cd noam-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Deploy the Cloudflare Worker**
   ```bash
   cd workers

   # Set API keys as secrets
   npx wrangler secret put TWELVEDATA_KEY
   # Paste your Twelve Data API key

   npx wrangler secret put FINNHUB_TOKEN
   # Paste your Finnhub API key

   # Deploy
   npx wrangler deploy
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your worker URL:
   ```
   REACT_APP_WORKER_URL=https://twelvedata-proxy.YOUR_SUBDOMAIN.workers.dev/api
   ```

5. **Start development server**
   ```bash
   npm start
   ```

6. **Open http://localhost:3000**

## 📊 Architecture

### Data Flow
```
React App → Cloudflare Worker → API Providers → Edge Cache → Browser Cache
                ↓
        Rate Limit Manager
                ↓
        localStorage Cache (24h)
```

### Key Components

**Frontend (React)**
- `BloombergSimple.jsx` - Main terminal interface
- `StatsTile.jsx` - Technical analysis display
- `PeersPanel.jsx` - Peer comparison widget
- `WatchlistSidebar.jsx` - Symbol management

**Services**
- `tdStats.js` - Twelve Data integration with local indicator calculations
- `peers.js` - Finnhub peer discovery with fallback
- `rateLimitManager.js` - Global rate limit state management

**API Proxy (Cloudflare Workers)**
- Edge caching (60s quotes, 24h peers)
- Rate limit logging
- API key protection
- CORS handling

### Caching Strategy

**Multi-Tier Cache:**
1. **Edge Cache** (Cloudflare): 60s quotes, 24h peers
2. **Memory Cache** (JS): 60s quotes, 15min series
3. **localStorage**: 24h persistent fallback

## 🎯 API Rate Limits

### Twelve Data (Free Plan)
- **8 requests/minute** after email confirmation
- **~800 calls/day** total
- Automatic caching reduces usage by 85%

### Finnhub (Free Plan)
- **60 calls/minute**
- Peers cached for 24h

## 🧪 Testing Rate Limits

The app includes built-in testing tools:

### UI Test Button
Click **"LIMIT"** in the header toolbar:
- Enables 5-minute test mode
- Button turns yellow, shows "CACHED"
- All API calls use cached data
- Click again to disable

### Console Commands
```javascript
// Enable test mode (5 minutes)
window.tdRateLimit.test(5)

// Check current state
window.tdRateLimit.getState()

// Reset and resume normal operation
window.tdRateLimit.reset()

// Check if exhausted
window.tdRateLimit.isExhausted()
```

See `docs/CACHE_TESTING_GUIDE.md` for detailed testing instructions.

## 📁 Project Structure

```
noam-website/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── StatsTile.jsx          # Technical analysis
│   │   ├── PeersPanel.jsx         # Peer comparison
│   │   └── WatchlistSidebar.jsx   # Symbol management
│   ├── hooks/              # Custom React hooks
│   │   └── useSmartPolling.js     # Market data polling
│   ├── services/           # API services
│   │   ├── tdStats.js             # Twelve Data integration
│   │   └── peers.js               # Finnhub peer discovery
│   ├── store/              # Zustand state management
│   │   └── useWatchlistStore.js   # Watchlist state
│   ├── utils/              # Utility functions
│   │   ├── rateLimitManager.js    # Rate limit handling
│   │   ├── ema.js                 # Technical indicators
│   │   └── api.js                 # API client
│   └── pages/
│       └── BloombergSimple.jsx    # Main terminal
├── workers/
│   └── twelvedata.js       # Cloudflare Worker proxy
├── docs/
│   ├── CACHE_TESTING_GUIDE.md     # Testing documentation
│   └── archive/            # Historical docs
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Development (`.env`):**
```bash
REACT_APP_WORKER_URL=https://your-worker.workers.dev/api
```

**Production (`.env.production`):**
```bash
REACT_APP_WORKER_URL=https://your-worker.workers.dev/api
```

### Cloudflare Worker (`wrangler.toml`)
```toml
name = "twelvedata-proxy"
main = "twelvedata.js"
compatibility_date = "2024-01-01"

[secrets]
TWELVEDATA_KEY = "..."  # Set via: wrangler secret put
FINNHUB_TOKEN = "..."   # Set via: wrangler secret put
```

## 📈 Technical Indicators

### RSI (Relative Strength Index)
- **Formula**: 100 - (100 / (1 + RS))
- **Period**: 14 days
- **Method**: Wilder's smoothing
- **Zones**: >70 overbought, <30 oversold

### MACD (Moving Average Convergence Divergence)
- **Fast EMA**: 12 periods
- **Slow EMA**: 26 periods
- **Signal**: 9-period EMA of MACD
- **Histogram**: MACD - Signal

### ATR (Average True Range)
- **Period**: 14 days
- **Method**: Wilder's smoothing
- **Use**: Volatility measurement

All indicators are computed **locally** from time series data to minimize API calls.

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to GitHub Pages
```bash
# Build
npm run build

# Deploy
npm run deploy
# or
gh-pages -d build
```

### Deploy Cloudflare Worker
```bash
cd workers
npx wrangler deploy
```

## 🔒 Security

- ✅ API keys stored in Cloudflare Worker secrets
- ✅ Environment variables in `.gitignore`
- ✅ No API keys in client-side code
- ✅ Rate limit protection
- ✅ CORS enabled on worker

## 📊 Data Attribution

**Market Data**: [Twelve Data](https://twelvedata.com)
**Company Peers**: [Finnhub](https://finnhub.io)

Free tier usage is for personal/educational purposes only. Public redistribution requires appropriate licensing.

## 🐛 Known Issues

- Market hours detection doesn't account for holidays
- Pre-market and after-hours data not supported
- Limited to 10 watchlist symbols

## 🗺️ Roadmap

- [ ] Holiday calendar integration
- [ ] Pre-market/after-hours support
- [ ] Options chain data
- [ ] News integration
- [ ] Interactive charts
- [ ] Portfolio tracking
- [ ] Alerts and notifications
- [ ] Dark/light theme toggle

## 🤝 Contributing

This is a personal portfolio project, but suggestions and feedback are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Noam Teshuva**

- Email: [Teshuva91@gmail.com](mailto:Teshuva91@gmail.com)
- LinkedIn: [Noam Teshuva](https://www.linkedin.com/in/noam-teshuva-452101221)
- GitHub: [@NoamTeshuva](https://github.com/NoamTeshuva)

## 🙏 Acknowledgments

- Twelve Data for market data API
- Finnhub for company intelligence
- Cloudflare Workers for edge computing
- React team for the framework
- Tailwind CSS for styling

---

**Note**: This is a personal portfolio project demonstrating financial data integration, real-time updates, and technical analysis. It is not financial advice and should not be used for actual trading decisions.
