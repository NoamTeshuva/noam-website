---
# Bloomberg Wannabe – Scope & Implementation Plan

## Objective  
Build a single-page **"Bloomberg-style" trading mini-terminal** that lives at `/bloomberg` inside the existing [noam-website](https://github.com/NoamTeshuva/noam-website) repo. It lets **Saul** (hard-coded user) search a stock, fetch competitor tickers, and view live quotes & basic fundamentals.

## Milestones

| Phase | Deliverable | Key files | Notes |
|-------|-------------|-----------|-------|
| **0. Environment** | Git branch, Tailwind setup | — | Prep & dependency install |
| **1. Routing integration** | New React Router setup, route `/bloomberg` | `src/App.js`, `src/pages/BloombergWannabe.jsx` | Keeps portfolio at `/` |
| **2. Theming** | Global dark-charcoal + orange palette (#0d0d0d / #f7b500) | `tailwind.config.js` | Mimic Bloomberg look |
| **3. Auth gate** | Simple login `/login` (user: **saul**, pass: **123456**) | `src/pages/Login.jsx`, guard HOC | Stores flag in `sessionStorage` |
| **4. Search & peers** | Autocomplete search; competitor list via Finnhub `symbol` & `peers` | `components/SearchBar.jsx`, `hooks/useSearch.js` | Needs Finnhub API key |
| **5. Live quote cards** | Realtime price stream & metrics | `components/QuoteCard.jsx`, `hooks/useLivePrice.js` | Polygon.io WebSocket |
| **6. Comparison table** | Sortable table comparing chosen tickers | `components/CompareTable.jsx` | TanStack Table |
| **7. Alerts** | Modal to set price/percent triggers, toast notifications | `hooks/useAlerts.js`, `context/AlertContext.jsx` | Rules saved in `localStorage` |
| **8. Polish & deploy** | 404 redirect, mobile tweaks, gh-pages deploy | — | Final QA |

## Tech Stack
- **React + Vite** (CRA today; migrate later if desired)
- **TailwindCSS** for styling
- **react-router-dom** for routing
- **Finnhub API** for search, peers & fundamentals
- **Polygon.io** WebSocket for live ticks
- **TanStack Table** for comparison view
- Optional **Express** proxy if you want to hide API keys

## File / Folder Skeleton
src/
pages/
BloombergWannabe.jsx
Login.jsx
components/
SearchBar.jsx
QuoteCard.jsx
CompareTable.jsx
hooks/
useSearch.js
useLivePrice.js
useAlerts.js
context/
AlertContext.jsx
tailwind.config.js
.env # API keys

yaml
Copy
Edit

## Misc Notes
* **Never commit `.env`** – use repo secrets or local file.  
* Alerts default polling interval: **1 s**; debounce form inputs.  
* Future: swap hard-coded auth for JWT + bcrypt.

---

Created: 2025-07-19
--- 