# ⚡ Conduit

**Pay-per-call API marketplace powered by x402 payments on the Stacks blockchain.**

> AI agents autonomously discover, pay for, and consume APIs using HTTP 402 — no API keys, no subscriptions, just HTTP and STX.

[![Built with x402-stacks](https://img.shields.io/badge/protocol-x402--stacks-6366f1)](https://github.com/tony1908/x402Stacks)
[![Network](https://img.shields.io/badge/network-Stacks%20Mainnet-orange)](https://stacks.co)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

> **Talent Protocol Update (Feb 2026):**
> New features added for the hackathon event including on-chain analytics helpers, trust scoring enhancements, and a streamlined event submission flow. See [EVENT_SUBMISSION.md](./EVENT_SUBMISSION.md) for details.

---

## The Problem

Today's API economy is broken for machines:
- Agents need **API keys** that require human account creation
- Rate limits and subscriptions assume **human consumption patterns**
- No protocol-level standard for **machine-to-machine payments**

## The Solution

**Conduit** uses the x402 payment protocol to create a marketplace where:
- 🤖 AI agents **discover** available APIs via a free catalog endpoint
- 🔒 Paid endpoints return **HTTP 402 Payment Required** with pricing
- 💎 The `x402-stacks` interceptor **auto-pays** in STX and retries
- ⚡ Data flows back — **no accounts, no keys, no friction**

```
Agent → GET /api/v1/price?symbol=BTC
Server → 402 Payment Required (0.005 STX)
Agent → Signs STX transfer via x402 interceptor
Server → 200 OK + { price: 97500.00, ... }
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Conduit Server                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Free Layer   │  │ x402 Paywall │  │ API Services     │  │
│  │              │  │              │  │                  │  │
│  │ /discover    │  │ paymentMiddle│  │ Weather          │  │
│  │ /stats       │  │ ware()       │  │ Sentiment        │  │
│  │ /health      │  │              │  │ Translation      │  │
│  └──────────────┘  │ Validates    │  │ Crypto Prices    │  │
│                    │ payment-sig  │  │ Image Gen        │  │
│                    │ header       │  │ Code Review      │  │
│                    └──────┬───────┘  │ News             │  │
│                           │          │ Chain Analytics   │  │
│                    ┌──────▼───────┐  └──────────────────┘  │
│                    │ Facilitator  │                         │
│                    │ Settlement   │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/conduit.git
cd conduit

# Install
npm install

# Configure (optional — defaults work out of the box)
cp .env.example .env

# Run
npm run build
npm run dev
```

Open **http://localhost:3402** in your browser.

---

## API Reference

### Free Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/discover` | GET | Full API catalog with pricing and docs |
| `/api/v1/stats` | GET | Marketplace analytics and recent transactions |
| `/api/v1/health` | GET | Server health check |

### Paid Endpoints (x402-protected)

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/v1/weather` | GET | 0.01 STX | Weather data and forecasts |
| `/api/v1/sentiment` | POST | 0.02 STX | NLP sentiment analysis |
| `/api/v1/translate` | POST | 0.015 STX | Neural machine translation |
| `/api/v1/price` | GET | 0.005 STX | Crypto price oracle |
| `/api/v1/generate-image` | POST | 0.05 STX | AI image generation |
| `/api/v1/code-review` | POST | 0.03 STX | Automated code review |
| `/api/v1/news` | GET | 0.008 STX | AI-curated news feed |
| `/api/v1/chain-analytics` | GET | 0.02 STX | Stacks on-chain analytics |

---

## Agent Integration

### Client (Auto-pay with x402 interceptor)

```javascript
import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';

const account = privateKeyToAccount(process.env.PRIVATE_KEY, 'mainnet');

const api = wrapAxiosWithPayment(
  axios.create({ baseURL: 'http://localhost:3402' }),
  account
);

// Discover APIs (free)
const catalog = await api.get('/api/v1/discover');

// Use paid APIs — payment is automatic
const weather = await api.get('/api/v1/weather?location=Tokyo');
const price = await api.get('/api/v1/price?symbol=BTC');
```

### Server (Monetize your own API)

```javascript
import express from 'express';
import { paymentMiddleware, STXtoMicroSTX } from 'x402-stacks';

const app = express();

app.get('/api/premium',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.01),
    payTo: 'YOUR_STACKS_ADDRESS',
    network: 'mainnet',
    facilitatorUrl: 'https://x402-facilitator.x402stacks.xyz',
    description: 'Premium data access',
  }),
  (req, res) => res.json({ data: 'Your premium content' })
);
```

---

## Agent Demo

Run the interactive agent demo to see the full x402 flow:

```bash
npm run agent:demo

# Or with a specific task:
node agent-demo/agent.js "What's the price of Bitcoin?"
node agent-demo/agent.js "Translate hello to Spanish"
node agent-demo/agent.js "Get blockchain news"
```

---

## Smart Contracts (Clarity)

Conduit includes 4 production-ready Clarity smart contracts that bring the marketplace logic on-chain:

### 1. `api-registry.clar` — On-Chain API Registry
Providers register APIs with pricing, descriptions, and metadata. Agents discover endpoints by reading contract state.

| Function | Description |
|----------|-------------|
| `register-api` | Register a new API with pricing and metadata |
| `update-api-price` | Update pricing for your API |
| `toggle-api-status` | Activate/deactivate an API |
| `get-api-by-id` | Read API details from chain |
| `get-api-by-slug` | Look up API by name slug |

### 2. `payment-escrow.clar` — Payment Escrow & Settlement
Handles the full payment lifecycle: deposit → settle → dispute → refund. Includes platform fees and expiry-based auto-refund.

| Function | Description |
|----------|-------------|
| `create-payment` | Deposit STX into escrow for an API call |
| `settle-payment` | Release escrowed STX to provider |
| `dispute-payment` | Lock funds for admin review |
| `refund-payment` | Admin refund for disputed payments |
| `claim-expired-escrow` | Auto-refund after 24h if unsettled |

### 3. `reputation.clar` — On-Chain Reputation System
Agents rate APIs after paid calls, building a trust layer. Includes 5 tiers: New → Bronze → Silver → Gold → Platinum.

| Function | Description |
|----------|-------------|
| `rate-api` | Submit a 1-5 star rating with comment |
| `get-api-reputation` | Full star distribution for an API |
| `get-api-average-rating` | Average rating (scaled ×100) |
| `get-provider-reputation` | Provider's aggregate score and tier |
| `has-rated` | Check if a user already rated an API |

### 4. `subscription-manager.clar` — Prepaid Credits & Subscriptions
Agents deposit STX to get credits with volume discounts (up to 100% bonus). Subscription plans with block-based expiry.

| Function | Description |
|----------|-------------|
| `purchase-credits` | Buy credits with volume discounts |
| `spend-credits` | Use credits for API calls |
| `subscribe` | Subscribe to a prepaid plan |
| `create-plan` | Admin: create subscription plans |
| `calculate-credits` | Preview credits for a deposit amount |

---

## Tech Stack

- **Runtime**: Node.js + Express.js
- **Protocol**: x402-stacks (HTTP 402 payment protocol)
- **Blockchain**: Stacks L2 (secured by Bitcoin)
- **Smart Contracts**: Clarity (Stacks native language)
- **Asset**: STX (Stacks token)
- **Frontend**: Vanilla HTML/CSS/JS with premium design
- **Settlement**: x402 Facilitator service

---

## Project Structure

```
conduit/
├── contracts/
│   ├── api-registry.clar        # On-chain API registration & discovery
│   ├── payment-escrow.clar      # STX escrow, settlement & disputes
│   ├── reputation.clar          # Rating system with provider tiers
│   └── subscription-manager.clar # Prepaid credits & subscription plans
├── server/index.js              # Express server with x402 middleware
├── public/
│   ├── index.html               # Marketplace UI
│   ├── css/styles.css           # Premium design system
│   └── js/app.js                # Frontend logic
├── agent-demo/agent.js          # AI agent demo script
├── package.json
├── .env.example
├── LICENSE
└── README.md
```

---

## License

MIT — see [LICENSE](./LICENSE)

---

**Built for the [x402 Stacks Challenge](https://dorahacks.io) on DoraHacks**

<!-- Node setup clarified -->


<!-- Security guidelines structure reviewed -->

