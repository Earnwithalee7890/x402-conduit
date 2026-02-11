# ⚡ x402 Agent Marketplace

> **AI agents autonomously discover, pay for, and consume APIs using HTTP 402 payments on the Stacks blockchain.**

No API keys. No subscriptions. No accounts. Just HTTP requests and instant crypto payments.

[![Built with x402-stacks](https://img.shields.io/badge/built%20with-x402--stacks-purple?style=for-the-badge)](https://github.com/tony1908/x402Stacks)
[![Powered by Stacks](https://img.shields.io/badge/powered%20by-Stacks-blue?style=for-the-badge)](https://stacks.co)
[![HTTP 402](https://img.shields.io/badge/HTTP-402%20Payment%20Required-orange?style=for-the-badge)](https://x402.org)

---

## 🚀 What is This?

The **x402 Agent Marketplace** is the first API marketplace built entirely on the x402 payment protocol. It demonstrates a future where:

- **AI agents** autonomously discover APIs they need
- **Payment is automatic** — just send an HTTP request, pay in STX, and get data
- **No intermediaries** — direct payments between agent and API provider
- **Micropayments work** — pay $0.005 per API call, no minimums

### The Problem

Traditional API marketplaces require:
1. ❌ Creating an account
2. ❌ Adding a payment method (KYC, credit card)
3. ❌ Buying credits or subscriptions
4. ❌ Managing API keys (security risk)
5. ❌ Complex authentication headers

### The x402 Solution

With x402 Agent Marketplace:
1. ✅ **Discover** → `GET /api/v1/discover` (free)
2. ✅ **Request** → `GET /api/v1/weather?location=Tokyo`
3. ✅ **Pay** → HTTP 402 → automatic STX payment
4. ✅ **Receive** → 200 OK with data

**That's it.** No accounts, no keys, no subscriptions.

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 🔍 **API Discovery** | Free endpoint returns full catalog with pricing, docs, and stats |
| 💰 **x402 Payments** | Every paid endpoint uses `paymentMiddleware` from x402-stacks |
| 🤖 **Agent-Ready** | Designed for autonomous AI agents using axios interceptors |
| ⚡ **Micropayments** | Prices from 0.005 STX (~$0.01) per request |
| 📊 **8 APIs** | Weather, Sentiment, Translation, Crypto Prices, News, Image Gen, Code Review, Chain Analytics |
| 🎨 **Beautiful UI** | Premium marketplace dashboard with live demo |
| 📈 **Real-time Stats** | Transaction monitoring and usage analytics |
| 🔐 **Multi-Token** | Supports STX and sBTC payments |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent / Client                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  axios + x402-stacks interceptor                    │ │
│  │  Automatically handles 402 → sign → pay → retry     │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP Request
                      ▼
┌─────────────────────────────────────────────────────────┐
│              x402 Agent Marketplace Server               │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │  Free Endpoints   │  │  Paid Endpoints             │   │
│  │  /discover        │  │  /weather      (0.01 STX)   │   │
│  │  /stats           │  │  /sentiment    (0.02 STX)   │   │
│  │  /health          │  │  /translate    (0.015 STX)  │   │
│  └──────────────────┘  │  /price         (0.005 STX)  │   │
│                         │  /generate-image(0.05 STX)   │   │
│  ┌──────────────────┐  │  /code-review   (0.03 STX)   │   │
│  │ x402-stacks      │  │  /news          (0.008 STX)  │   │
│  │ paymentMiddleware │  │  /chain-analytics(0.02 STX)  │   │
│  └──────────────────┘  └────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │ Verify & Settle
                      ▼
┌─────────────────────────────────────────────────────────┐
│              x402 Facilitator (Stacks)                    │
│  Verifies signatures → Broadcasts tx → Confirms payment  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/x402-agent-marketplace.git
cd x402-agent-marketplace

# Install dependencies
npm install

# Start the server
npm run dev
```

The marketplace will be running at **http://localhost:3402**

### Try the Live Demo

1. Open http://localhost:3402 in your browser
2. Browse the API catalog
3. Use the interactive demo to test endpoints
4. See the x402 payment flow in action

### Run the AI Agent Demo

```bash
# Default task (weather)
npm run agent:demo

# Custom tasks
node agent-demo/agent.js "What's the price of Bitcoin?"
node agent-demo/agent.js "Translate hello to Spanish"
node agent-demo/agent.js "Analyze the sentiment of this review"
node agent-demo/agent.js "Get the latest blockchain news"
```

---

## 💻 API Reference

### Free Endpoints (No Payment Required)

#### `GET /api/v1/discover`
Returns the full API catalog with pricing, documentation, and usage statistics.

#### `GET /api/v1/stats`
Returns marketplace analytics and recent transactions.

#### `GET /api/v1/health`
Health check endpoint.

### Paid Endpoints (x402 Payment Required)

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/v1/weather` | GET | 0.01 STX | Weather data & forecasts |
| `/api/v1/sentiment` | POST | 0.02 STX | AI sentiment analysis |
| `/api/v1/translate` | POST | 0.015 STX | Neural translation |
| `/api/v1/price` | GET | 0.005 STX | Crypto price oracle |
| `/api/v1/generate-image` | POST | 0.05 STX | AI image generation |
| `/api/v1/code-review` | POST | 0.03 STX | Automated code review |
| `/api/v1/news` | GET | 0.008 STX | Smart news aggregation |
| `/api/v1/chain-analytics` | GET | 0.02 STX | Stacks blockchain analytics |

### Payment Flow

When you request a paid endpoint without payment:

```
→ GET /api/v1/weather?location=Tokyo
← 402 Payment Required
   Header: x-payment-required: { amount, payTo, network, ... }

→ [x402-stacks interceptor automatically]
   Signs STX transfer → Sends to facilitator → Retries request

← 200 OK
   { data: { temperature: 22, condition: "Sunny", ... } }
```

---

## 🤖 Agent Integration

### Using x402-stacks (Recommended)

```javascript
import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';

// Create account from private key
const account = privateKeyToAccount(process.env.PRIVATE_KEY, 'testnet');

// Wrap axios with automatic payment handling
const api = wrapAxiosWithPayment(
  axios.create({ baseURL: 'http://localhost:3402' }),
  account
);

// 1. Discover APIs (free)
const catalog = await api.get('/api/v1/discover');
console.log(`${catalog.data.totalAPIs} APIs available`);

// 2. Use paid APIs (payment is automatic!)
const weather = await api.get('/api/v1/weather?location=Tokyo');
console.log(weather.data); // ✅ 0.01 STX paid automatically

const price = await api.get('/api/v1/price?symbol=BTC');
console.log(price.data); // ✅ 0.005 STX paid automatically
```

### Adding Your Own API to the Marketplace

```javascript
import { paymentMiddleware, STXtoMicroSTX } from 'x402-stacks';

// Protect any Express endpoint with one middleware line
app.get('/api/my-service',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.01),
    payTo: 'YOUR_STACKS_ADDRESS',
    network: 'testnet',
    facilitatorUrl: 'https://x402-facilitator.x402stacks.xyz',
    description: 'My awesome API service',
  }),
  (req, res) => {
    res.json({ data: 'Your premium data here!' });
  }
);
```

---

## 🏆 Why This Matters

### For AI Agents
- **Zero-friction API access** — No accounts, no API keys, no setup
- **Autonomous operation** — Agents can discover and pay for APIs without human intervention
- **Cost efficiency** — Pay only for what you use, as low as $0.001 per request

### For API Providers
- **Instant monetization** — Add one middleware line to monetize any endpoint
- **No billing infrastructure** — Payments happen at the HTTP level
- **Global access** — Anyone with STX can use your API, no registration

### For the Stacks Ecosystem
- **Real utility for STX** — Microtransactions for API access
- **Bitcoin security** — Payments anchored to Bitcoin via Stacks
- **x402 adoption** — Demonstrates the power of the x402 standard

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Protocol** | x402-stacks (HTTP 402 Payment Required) |
| **Blockchain** | Stacks (Bitcoin L2) |
| **Server** | Express.js with x402 payment middleware |
| **Client** | Axios with x402 payment interceptor |
| **Tokens** | STX, sBTC |
| **Frontend** | Vanilla HTML/CSS/JS with premium dark theme |
| **Design** | Custom design system with glassmorphism & micro-animations |

---

## 📁 Project Structure

```
x402-agent-marketplace/
├── server/
│   └── index.js              # Express server with 8 paywalled + 3 free endpoints
├── public/
│   ├── index.html            # Marketplace landing page
│   ├── css/
│   │   └── styles.css        # Premium design system
│   └── js/
│       └── app.js            # Frontend interactions & live demo
├── agent-demo/
│   └── agent.js              # AI agent demo script
├── package.json
├── .env.example
└── README.md
```

---

## 🔮 Future Roadmap

- [ ] **Agent SDK** — NPM package for agents to integrate marketplace
- [ ] **Dynamic Pricing** — Surge pricing, volume discounts
- [ ] **API Provider Portal** — Let anyone list their API
- [ ] **Agent-to-Agent Payments** — Agents paying other agents
- [ ] **sBTC Payments** — Bitcoin-native payments via sBTC
- [ ] **Usage Dashboard** — Analytics for API providers
- [ ] **Rate Limiting** — Free tier with pay-when-exceeded
- [ ] **Multi-Chain** — Support for Base, Solana via core x402

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [x402-stacks](https://github.com/tony1908/x402Stacks) — x402 payment protocol for Stacks
- [x402.org](https://x402.org) — The x402 open payment standard by Coinbase
- [Stacks](https://stacks.co) — Bitcoin L2 blockchain
- [DoraHacks](https://dorahacks.io) — Hackathon platform

---

**Built for the [x402 Stacks Challenge](https://dorahacks.io) hackathon** 🏆

*Making the internet's original payment status code finally useful.*
