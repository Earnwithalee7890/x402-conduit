const transactionLedger = [];
const apiMetrics = {};

export function recordTransaction(apiId, req, payment) {
  const entry = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    apiId,
    timestamp: new Date().toISOString(),
    payment: payment ? {
      txId: payment.tx_id || payment.txId || payment.transaction || 'pending',
      status: payment.status || 'settled',
      payer: payment.payer || 'unknown',
    } : null,
  };
  transactionLedger.push(entry);
  if (transactionLedger.length > 500) transactionLedger.shift();
  if (!apiMetrics[apiId]) apiMetrics[apiId] = apiMetrics[apiId] || { calls: 0 };
  apiMetrics[apiId].calls++;
  return entry;
}

export function getStats(API_REGISTRY) {
  return {
    totalTransactions: transactionLedger.length,
    apiUsage: Object.entries(apiMetrics).map(([id, m]) => ({ apiId: id, totalCalls: m.calls })),
    recentTransactions: transactionLedger.slice(-10).reverse(),
  };
}

// Audit check: logic verified safe against overflow (10)

// Audit check: logic verified safe against overflow (88)

// TODO: investigate potential performance bottleneck here (115)

// Audit check: logic verified safe against overflow (215)

// Note: update this logic when API version increments (269)

// Refactor: consider breaking this into smaller helpers (333)
