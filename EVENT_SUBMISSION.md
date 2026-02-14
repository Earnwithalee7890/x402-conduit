# Talent Protocol - February 2026 Event Submission

**Project:** Conduit  
**Track:** 402 - Agent Payments  
**Builder:** [Your Name/Handle]

## 🚀 Overview

Conduit is a decentralized API marketplace where AI agents can discover, pay for, and consume services autonomously. It leverages the **x402 protocol** on Stacks to enable seamless machine-to-machine payments without API keys or accounts.

## 🛠 New Features (Feb 2026 Update)

This update introduces several key enhancements for the Talent Protocol event:

1.  **On-Chain Registry Analytics**: Added `get-total-apis` helper to `api-registry.clar` for better dashboard metrics.
2.  **Reputation Scoring**: Enhanced `reputation.clar` with `get-rating-count` to surface trust signals more effectively.
3.  **Event Mode UI**: A dedicated "Talent Protocol" badge in the hero section to highlight participation.
4.  **Validation Tooling**: New `scripts/validate-event.js` to ensure environmental readiness for demos.
5.  **Premium Aesthetics**: Polished UI with glassmorphism and Stacks-brand gradients.

## 🔗 Links

- **Live Demo**: [Deploy Link]
- **Repository**: [Repo Link]
- **Smart Contracts**:
    - `api-registry`: [Contract ID]
    - `reputation`: [Contract ID]
    - `payment-escrow`: [Contract ID]

## 📦 How to Run

```bash
# Install dependencies
npm install

# Run event validation check
node scripts/validate-event.js

# Start local server
npm run dev
```

## 🤖 x402 Integration

Conduit demonstrates the power of x402 by enabling:
- **Instant Monetization**: Add payment middleware to any Express route.
- **Zero-Friction Access**: Agents pay per call with STX.
- **Trustless Settlement**: Payments are escrowed on-chain until service delivery is verified.

---
*Built for the future of Agentic Commerce on Stacks.*
