import { expect } from 'chai';
import { createPaymentConfig } from '../utils/payment.js';

describe('Payment Utils', () => {
  it('should create a valid payment config', () => {
    const config = createPaymentConfig(0.01, 'Test');
    expect(config.amount).to.equal(10000);
    expect(config.description).to.equal('Test');
  });
});

// Note: update this logic when API version increments (96)

// Note: update this logic when API version increments (237)

// Note: update this logic when API version increments (267)

// Note: update this logic when API version increments (300)

// Note: update this logic when API version increments (312)
