# Toxicology Archive — Diagnostic Lab

Web3 research archive and live 5-stage memecoin screening lab built with React, Vite, Express, Three.js (`@react-three/fiber` + `@react-three/drei`), and Firebase.

---

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and populate any optional API keys:
   ```bash
   cp .env.example .env
   ```
3. Run the full-stack dev server (Express API + Vite on port `3000`):
   ```bash
   npm run dev
   ```
4. Type-check and build for production:
   ```bash
   npm run lint
   npm run build
   npm start
   ```

---

## Environment Variables & Data Sources

All upstream requests are executed server-side via Express routes (`/api/lab/*`) with a 60-second in-memory TTL cache, an 8-second request timeout, and automatic retry on transient 5xx/network errors.

### Free / Zero-Key Sources (Active Out of the Box)
- **DexScreener API**: Pair resolution, liquidity USD, 24h volume, transaction flow buckets (`5m`, `1h`, `6h`, `24h`), price deltas, and official project links.
- **RugCheck API**: Solana mint authority, freeze authority, metadata mutability, LP lock ratio, and top-10 holder distribution.
- **GoPlus Security API**: EVM honeypot check, entry/exit transfer tax, contract verification, ownership status, proxy/blacklist flags, LP lock status, and holder count.
- **CoinGecko Public API**: Token metadata and market-cap rank lookup (optional demo key supported).
- **Google News RSS**: Live news headlines fallback when `GNEWS_API_KEY` and `NEWS_API_KEY` are unset.

### Optional Key-Enabled Sources (`.env`)
| Variable | Purpose | Behavior When Unset |
|---|---|---|
| `X_BEARER_TOKEN` | X API v2 recent mentions & official account cadence | Shows `"Connect X API to enable"` with direct `"Open on X"` search link (never fabricates posts) |
| `GNEWS_API_KEY` | GNews structured headline search | Falls back to NewsAPI or Google News RSS |
| `NEWS_API_KEY` | NewsAPI headline search | Falls back to Google News RSS |
| `BIRDEYE_API_KEY` | Solana holder count enrichment in Stage 3 | Uses RugCheck holder telemetry |
| `HELIUS_API_KEY` | Solana RPC largest accounts lookup in Stage 3 | Uses RugCheck holder telemetry |
| `COINGECKO_API_KEY` | Higher CoinGecko Demo API rate limits | Uses CoinGecko public tier |
| `GEMINI_API_KEY` | Optional neutral 3-sentence telemetry recap (`/api/lab/recap`) | Recap button returns configuration error cleanly |

---

## Diagnostic Lab API Routes

- `GET /api/lab/resolve?q=<input>` — Auto-detects EVM `0x...`, Solana base58, `@handle`, DexScreener URL, Pump.fun URL, or ticker query and returns sorted candidate pairs with liquidity and creation timestamp.
- `GET /api/lab/stage/1?chain=...&address=...&pairAddress=...` — Identity, pair age, duplicate ticker count, CoinGecko lookup.
- `GET /api/lab/stage/2?chain=...&address=...` — Contract safety (Solana via RugCheck, EVM via GoPlus).
- `GET /api/lab/stage/3?chain=...&address=...&pairAddress=...` — Pool liquidity, LP lock/burn status, top-10 holder concentration, deployer share.
- `GET /api/lab/stage/4?chain=...&address=...&pairAddress=...` — 24h volume/liquidity ratio, wash-trading hint, inflow/outflow transaction counts (`5m`, `1h`, `6h`, `24h`).
- `GET /api/lab/stage/5?chain=...&address=...&symbol=...&name=...&xHandle=...` — SSRF-safe official link resolution, news headlines, and X snapshot.
- `POST /api/lab/recap` — Generates a strictly neutral 3-sentence summary of measured facts using `gemini-4-hydrogen`.

---

## Advice-Free & UX Compliance Checklist

| Rule | Verification | Status |
|---|---|---|
| Strictly Informational Copy | Zero advice language or prohibited terms (`buy`, `sell`, `safe`, `scam`, `go for it`, `good coin`) across UI and server telemetry; uses neutral labels (`Flag observed`, `Not detected`). | PASS |
| Mandatory Result Footer | Diagnostic Lab renders `"Informational only. Not financial advice. Verify independently."` | PASS |
| Brand Tokens Preserved | `#E10000` hero red, `#050505` obsidian background, `#0E0E0E` / `#161616` clay surfaces, `#2A2A2A` borders, Crown mark, Space Grotesk + Inter + JetBrains Mono. | PASS |
| 3D Performance & Accessibility | Lazy-loaded React Three Fiber 5-stage scanner (`Overview`, `Core`, `Top`, `Auto-Orbit`) with `prefers-reduced-motion` and WebGL flat-ring fallback. | PASS |
| Touch Targets & Contrast | Interactive buttons/tabs meet `>= 44px` height; `#FF554A` used for small red labels on dark surfaces; visible `focus-visible` rings. | PASS |
| Resilience & Error States | Per-stage partial failure cards with `Retry`, 60s server cache, 8s timeout, 30s auto-poll, freshness timer, and offline detection. | PASS |
