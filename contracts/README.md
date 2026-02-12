# Conduit Smart Contracts

This directory contains the Clarity smart contracts powering the Conduit API marketplace on the Stacks blockchain.

## Contracts

### 1. `api-registry.clar`
The core registry for API providers.
- **Functions**: `register-api`, `update-api-price`, `get-api-by-id`
- **Purpose**: Allows agents to discover available APIs and their pricing models on-chain.

### 2. `payment-escrow.clar`
Handles payment flow using the x402 protocol.
- **Functions**: `create-payment`, `settle-payment`, `refund-payment`
- **Purpose**: Securely holds STX until API service delivery is confirmed.

### 3. `reputation.clar`
Tracks provider reliability and uptime.
- **Functions**: `rate-api`, `get-provider-reputation`
- **Purpose**: Builds trust in the decentralized marketplace.

### 4. `subscription-manager.clar`
Manages recurring payments and prepaid credits.
- **Functions**: `purchase-credits`, `spend-credits`
- **Purpose**: Optimized for high-frequency agent API calls.

## Deployment

To deploy these contracts to the Stacks network:

```bash
# Using Clarinet
clarinet integrate

# manual deployment
stx deploy_contract ./contracts/api-registry.clar api-registry ...
```

## Testing

Run unit tests:

```bash
clarinet test
```
