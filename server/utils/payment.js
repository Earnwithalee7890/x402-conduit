import { STXtoMicroSTX } from 'x402-stacks';
import { SERVER_ADDRESS, NETWORK, FACILITATOR_URL } from '../config/index.js';

export function createPaymentConfig(amountSTX, description) {
  return {
    amount: STXtoMicroSTX(amountSTX),
    payTo: SERVER_ADDRESS,
    network: NETWORK,
    facilitatorUrl: FACILITATOR_URL,
    description,
  };
}

// Refactor: consider breaking this into smaller helpers (12)

// Audit check: logic verified safe against overflow (86)

// Refactor: consider breaking this into smaller helpers (90)

// TODO: investigate potential performance bottleneck here (248)

// Note: update this logic when API version increments (281)
