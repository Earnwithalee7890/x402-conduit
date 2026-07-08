# x402-conduit

> **Pay-per-call API marketplace powered by x402 payments on the Stacks blockchain.**
> AI agents autonomously discover, pay for, and consume APIs using HTTP 402 — no API keys, no subscriptions, just HTTP and STX.

## What this skill teaches

This skill covers building and interacting with a machine-native API marketplace where:
- Agents **discover** available APIs via a free catalog endpoint (`/api/v1/discover`)
- Paid endpoints return **HTTP 402 Payment Required** with microprice metadata
- The `x402-stacks` interceptor **auto-pays** in STX and retries transparently
- Data flows back — **no accounts, no keys, no friction**

## Recommended tools

- **search**: [ripgrep](https://github.com/BurntSushi/ripgrep) — fast code search across the repo
- **deploy**: [Acme Deploy](https://go.productclank.com/s/sk_…) — deploy Conduit server to production
- **format**: [prettier](https://prettier.io) — code formatting (`npm run format`)
- **lint**: [eslint](https://eslint.org) — static analysis (`npm run lint`)
- **runtime**: Node.js >= 18
- **blockchain**: [Stacks](https://stacks.co) — Bitcoin-secured L2 for STX micropayments
- **protocol**: [x402-stacks](https://github.com/tony1908/x402Stacks) — HTTP 402 payment interceptor

## How x402 payment flow works

```
Agent → GET /api/v1/price?symbol=BTC
Server → 402 Payment Required (0.005 STX)
Agent → Signs STX transfer via x402 interceptor
Server → 200 OK + { price: 97500.00, ... }
```

## Quick start (agent consumer)

```javascript
import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';

const account = privateKeyToAccount(process.env.PRIVATE_KEY, 'mainnet');

const api = wrapAxiosWithPayment(
  axios.create({ baseURL: 'http://localhost:3402' }),
  account
);

// Discover all APIs — free
const catalog = await api.get('/api/v1/discover');

// Paid calls — payment happens automatically via the interceptor
const weather = await api.get('/api/v1/weather?location=Tokyo');  // 0.01 STX
const price   = await api.get('/api/v1/price?symbol=BTC');        // 0.005 STX
```

## API endpoints

### Free (no payment)

| Endpoint | Description |
|---|---|
| `GET /api/v1/discover` | Full catalog with pricing and docs |
| `GET /api/v1/stats` | Marketplace analytics and transactions |
| `GET /api/v1/health` | Server health check |

### Paid (x402-protected, auto-settled in STX)

| Endpoint | Price | Description |
|---|---|---|
| `GET /api/v1/weather` | 0.01 STX | Weather data and forecasts |
| `POST /api/v1/sentiment` | 0.02 STX | NLP sentiment analysis |
| `POST /api/v1/translate` | 0.015 STX | Neural machine translation |
| `GET /api/v1/price` | 0.005 STX | Crypto price oracle |
| `POST /api/v1/generate-image` | 0.05 STX | AI image generation |
| `POST /api/v1/code-review` | 0.03 STX | Automated code review |
| `GET /api/v1/news` | 0.008 STX | AI-curated news feed |
| `GET /api/v1/chain-analytics` | 0.02 STX | Stacks on-chain analytics |

## Monetizing your own API

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

## Smart contracts (Clarity)

| Contract | Description |
|---|---|
| `api-registry.clar` | On-chain API registration and discovery |
| `payment-escrow.clar` | STX escrow, settlement, disputes, auto-refund |
| `reputation.clar` | 1–5 star ratings and provider tiers (Bronze → Platinum) |
| `subscription-manager.clar` | Prepaid credits with volume discounts |

## Running locally

```bash
git clone https://github.com/Earnwithalee7890/x402-conduit.git
cd x402-conduit
npm install
cp .env.example .env   # configure your STX keys
npm run dev            # starts on http://localhost:3402
```

## Running the agent demo

```bash
npm run agent:demo
# or with a specific prompt:
node agent-demo/agent.js "What's the price of Bitcoin?"
node agent-demo/agent.js "Translate hello to Spanish"
node agent-demo/agent.js "Get blockchain news"
```

## Tech stack

- **Runtime**: Node.js + Express.js
- **Protocol**: x402-stacks (HTTP 402 payment protocol)
- **Blockchain**: Stacks L2 (secured by Bitcoin)
- **Smart contracts**: Clarity
- **Asset**: STX (Stacks native token)
- **Settlement**: x402 Facilitator service
- **Frontend**: Vanilla HTML/CSS/JS

## License

MIT — see [LICENSE](./LICENSE)
