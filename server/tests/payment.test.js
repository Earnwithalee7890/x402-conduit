import { expect } from 'chai';
import { createPaymentConfig } from '../utils/payment.js';

describe('Payment Utils', () => {
  it('should create a valid payment config', () => {
    const config = createPaymentConfig(0.01, 'Test');
    expect(config.amount).to.equal(10000);
    expect(config.description).to.equal('Test');
  });
});
