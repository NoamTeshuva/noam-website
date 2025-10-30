# Deploy Cloudflare Worker with Finnhub Token

## Prerequisites

You need to have the Finnhub API token ready. Your token is:
```
d24hagpr01qu2jgi9qd0d24hagpr01qu2jgi9qdg
```

## Deployment Steps

### 1. Set the Finnhub Token as a Secret

```bash
npx wrangler secret put FINNHUB_TOKEN
```

When prompted, paste: `d24hagpr01qu2jgi9qd0d24hagpr01qu2jgi9qdg`

### 2. Verify Existing Secrets

Check that TWELVEDATA_KEY is still set:
```bash
npx wrangler secret list
```

### 3. Deploy the Worker

```bash
npx wrangler deploy
```

or use the npm script:
```bash
npm run deploy:worker
```

## Verification

After deployment, test the Finnhub endpoint:

```bash
# Test RCL peers (should return CCL, NCLH, etc.)
curl "https://twelvedata-proxy.teshuva91.workers.dev/api/finnhub/stock/peers?symbol=RCL"

# Test Twelve Data quote (should still work)
curl "https://twelvedata-proxy.teshuva91.workers.dev/api/quote?symbol=AAPL"
```

## Monitoring

Check Worker logs for rate limit events:
- `FINNHUB_429` - Finnhub rate limit exceeded
- `TD_429_MINUTE` - Twelve Data minute limit exceeded

## Cache Headers

Check the `x-cache` header to verify caching is working:
- `x-cache: HIT` - Served from cache
- `x-cache: MISS` - Fresh fetch from API

Example:
```bash
curl -I "https://twelvedata-proxy.teshuva91.workers.dev/api/finnhub/stock/peers?symbol=RCL"
```
