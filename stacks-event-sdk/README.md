# @earnwithalee/stacks-april-event-sdk

Official SDK and utility library for the **Stacks April 2026 Event on Talent Protocol**.

## 🚀 Overview

This package simplifies the integration of the **Nakamoto Pulse Signaling** required for the April Batch submission. It provides type-safe wrappers for Clarity smart contract calls and reputation lookups.

## 📦 Installation

```bash
npm install @earnwithalee/stacks-april-event-sdk
```

## 🛠 Usage

### Nakamoto Pulse Signaling

Signal your participation in the fee-free check-in for the event:

```javascript
import { signalNakamotoPulse } from '@earnwithalee/stacks-april-event-sdk';

const txId = await signalNakamotoPulse(process.env.PRIVATE_KEY);
console.log('Pulse Broadcasted:', txId);
```

### Builder Score Lookup

Retrieve reputation scores for the April Batch:

```javascript
import { getBuilderScore } from '@earnwithalee/stacks-april-event-sdk';

const { score } = await getBuilderScore('SP...');
```

## 🔗 Event Metadata

- **Batch**: April 2026
- **Track**: Stacks Builder Rewards
- **Platform**: Talent Protocol

---
Built with ❤️ by Earnwithalee7890 for the Stacks ecosystem.
