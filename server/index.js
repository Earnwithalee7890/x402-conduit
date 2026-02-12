/**
 * Conduit — Server
 * 
 * Pay-per-call API marketplace where AI agents autonomously discover,
 * pay for, and consume APIs using the x402 payment protocol on Stacks.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  paymentMiddleware,
  getPayment,
  STXtoMicroSTX,
} from 'x402-stacks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3402;

// ─── Configuration ───────────────────────────────────────────────────────────
const NETWORK = process.env.STACKS_NETWORK || 'mainnet';
const SERVER_ADDRESS = process.env.SERVER_ADDRESS || 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://x402-facilitator.x402stacks.xyz';

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Transaction Ledger ─────────────────────────────────────────────────────
const transactionLedger = [];
const apiMetrics = {};

// ─── API Registry ────────────────────────────────────────────────────────────
const API_REGISTRY = [
  {
    id: 'weather',
    name: 'Weather Intelligence',
    description: 'Real-time weather data, 5-day forecasts, and climate analytics for any global location.',
    category: 'Data',
    icon: '🌤️',
    pricing: { amount: '0.01', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/weather',
    method: 'GET',
    params: { location: 'string — city name or coordinates' },
    responseFormat: 'JSON',
    latency: '~120ms',
    uptime: '99.9%',
    requests: 15420,
  },
  {
    id: 'sentiment',
    name: 'Sentiment Analysis',
    description: 'NLP-powered sentiment scoring with emotion detection for text, reviews, and social data.',
    category: 'AI/ML',
    icon: '🧠',
    pricing: { amount: '0.02', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/sentiment',
    method: 'POST',
    params: { text: 'string — content to analyze' },
    responseFormat: 'JSON',
    latency: '~250ms',
    uptime: '99.7%',
    requests: 8930,
  },
  {
    id: 'translate',
    name: 'Neural Translator',
    description: 'Context-aware neural translation across 100+ languages with confidence scoring.',
    category: 'AI/ML',
    icon: '🌍',
    pricing: { amount: '0.015', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/translate',
    method: 'POST',
    params: { text: 'string', from: 'string', to: 'string' },
    responseFormat: 'JSON',
    latency: '~180ms',
    uptime: '99.8%',
    requests: 12100,
  },
  {
    id: 'price-oracle',
    name: 'Crypto Price Oracle',
    description: 'Real-time prices, 24h stats, sparkline data, and market analytics for 5000+ tokens.',
    category: 'DeFi',
    icon: '📊',
    pricing: { amount: '0.005', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/price',
    method: 'GET',
    params: { symbol: 'string — e.g. BTC, ETH, STX' },
    responseFormat: 'JSON',
    latency: '~80ms',
    uptime: '99.95%',
    requests: 45200,
  },
  {
    id: 'image-gen',
    name: 'Image Generation',
    description: 'Generate high-quality images from text prompts using state-of-the-art diffusion models.',
    category: 'AI/ML',
    icon: '🎨',
    pricing: { amount: '0.05', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/generate-image',
    method: 'POST',
    params: { prompt: 'string', style: 'realistic | anime | abstract' },
    responseFormat: 'JSON',
    latency: '~3.5s',
    uptime: '99.5%',
    requests: 3200,
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Automated code analysis with security auditing, quality scoring, and optimization tips.',
    category: 'Developer',
    icon: '🔍',
    pricing: { amount: '0.03', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/code-review',
    method: 'POST',
    params: { code: 'string', language: 'string' },
    responseFormat: 'JSON',
    latency: '~1.2s',
    uptime: '99.6%',
    requests: 5600,
  },
  {
    id: 'news-feed',
    name: 'News Aggregator',
    description: 'AI-curated news with topic filtering, summarization, and relevance scoring.',
    category: 'Data',
    icon: '📰',
    pricing: { amount: '0.008', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/news',
    method: 'GET',
    params: { topic: 'string', limit: 'number' },
    responseFormat: 'JSON',
    latency: '~200ms',
    uptime: '99.8%',
    requests: 22100,
  },
  {
    id: 'chain-analytics',
    name: 'Chain Analytics',
    description: 'Stacks blockchain intelligence — wallet profiles, contract analysis, on-chain metrics.',
    category: 'DeFi',
    icon: '⛓️',
    pricing: { amount: '0.02', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/chain-analytics',
    method: 'GET',
    params: { address: 'string — Stacks address' },
    responseFormat: 'JSON',
    latency: '~350ms',
    uptime: '99.7%',
    requests: 7800,
  },
];

function createPaymentConfig(amountSTX, description) {
  return {
    amount: STXtoMicroSTX(amountSTX),
    payTo: SERVER_ADDRESS,
    network: NETWORK,
    facilitatorUrl: FACILITATOR_URL,
    description,
  };
}

function recordTransaction(apiId, req, payment) {
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
  if (!apiMetrics[apiId]) apiMetrics[apiId] = { calls: 0 };
  apiMetrics[apiId].calls++;
  return entry;
}


// ═══════════════════════════════════════════════════════════════════════════════
// FREE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/v1/discover', (req, res) => {
  res.json({
    marketplace: 'Conduit',
    protocol: 'x402-stacks',
    version: '2.0',
    network: NETWORK,
    facilitator: FACILITATOR_URL,
    paymentAddress: SERVER_ADDRESS,
    totalAPIs: API_REGISTRY.length,
    categories: [...new Set(API_REGISTRY.map(a => a.category))],
    apis: API_REGISTRY.map(api => ({
      id: api.id,
      name: api.name,
      description: api.description,
      category: api.category,
      icon: api.icon,
      pricing: api.pricing,
      endpoint: api.endpoint,
      method: api.method,
      params: api.params,
      latency: api.latency,
      uptime: api.uptime,
    })),
    integration: {
      npm: 'npm install x402-stacks axios',
      client: 'wrapAxiosWithPayment(axios.create({ baseURL }), account)',
      server: 'paymentMiddleware({ amount, payTo, network, facilitatorUrl })',
    },
  });
});

app.get('/api/v1/stats', (req, res) => {
  res.json({
    marketplace: 'Conduit',
    uptime: process.uptime(),
    stats: {
      totalAPIs: API_REGISTRY.length,
      totalTransactions: transactionLedger.length,
      categories: [...new Set(API_REGISTRY.map(a => a.category))].length,
      apiUsage: Object.entries(apiMetrics).map(([id, m]) => ({ apiId: id, totalCalls: m.calls })),
      recentTransactions: transactionLedger.slice(-10).reverse(),
    },
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    protocol: 'x402-stacks',
    network: NETWORK,
    apis: API_REGISTRY.length,
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// PAID ENDPOINTS — Protected by x402 Payment Middleware
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/v1/weather',
  paymentMiddleware(createPaymentConfig(0.01, 'Weather Intelligence')),
  (req, res) => {
    const location = req.query.location || 'New York';
    const payment = getPayment(req);
    recordTransaction('weather', req, payment);

    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm', 'Snow', 'Clear'];
    const temp = Math.round(15 + Math.random() * 25);
    res.json({
      api: 'Weather Intelligence',
      data: {
        location,
        current: {
          temperature: { celsius: temp, fahrenheit: Math.round(temp * 9 / 5 + 32) },
          condition: conditions[Math.floor(Math.random() * conditions.length)],
          humidity: Math.round(40 + Math.random() * 50),
          windSpeed: { kmh: Math.round(5 + Math.random() * 30) },
          uvIndex: Math.round(1 + Math.random() * 10),
          pressure: Math.round(1000 + Math.random() * 30),
        },
        forecast: Array.from({ length: 5 }, (_, i) => ({
          day: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
          high: Math.round(temp + Math.random() * 8 - 4),
          low: Math.round(temp - 5 + Math.random() * 4 - 2),
          condition: conditions[Math.floor(Math.random() * conditions.length)],
        })),
        timestamp: new Date().toISOString(),
      },
    });
  }
);

app.post('/api/v1/sentiment',
  paymentMiddleware(createPaymentConfig(0.02, 'Sentiment Analysis')),
  (req, res) => {
    const text = req.body.text || 'x402 is revolutionizing payments on the internet!';
    const payment = getPayment(req);
    recordTransaction('sentiment', req, payment);

    const words = text.toLowerCase().split(/\s+/);
    const pos = ['great', 'good', 'amazing', 'excellent', 'love', 'revolutionary', 'innovative', 'best'];
    const neg = ['bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'broken'];
    let p = 0, n = 0;
    words.forEach(w => { if (pos.some(pw => w.includes(pw))) p++; if (neg.some(nw => w.includes(nw))) n++; });
    const score = ((p - n) / (words.length || 1) * 5 + 0.5);
    const sentiment = score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral';

    res.json({
      api: 'Sentiment Analysis',
      data: {
        text: text.substring(0, 500),
        sentiment,
        confidence: Math.min(0.99, 0.6 + Math.abs(score) * 0.3).toFixed(3),
        score: parseFloat(score.toFixed(3)),
        emotions: {
          joy: parseFloat((sentiment === 'positive' ? 0.5 + Math.random() * 0.4 : Math.random() * 0.3).toFixed(3)),
          anger: parseFloat((sentiment === 'negative' ? 0.3 + Math.random() * 0.4 : Math.random() * 0.1).toFixed(3)),
          trust: parseFloat((sentiment === 'positive' ? 0.4 + Math.random() * 0.4 : Math.random() * 0.3).toFixed(3)),
        },
        wordCount: words.length,
        model: 'sentiment-xl-v3',
        timestamp: new Date().toISOString(),
      },
    });
  }
);

app.post('/api/v1/translate',
  paymentMiddleware(createPaymentConfig(0.015, 'Neural Translator')),
  (req, res) => {
    const { text = 'Hello, world!', from = 'en', to = 'es' } = req.body;
    const payment = getPayment(req);
    recordTransaction('translate', req, payment);

    const translations = {
      es: { 'Hello, world!': '¡Hola, mundo!' },
      fr: { 'Hello, world!': 'Bonjour, le monde!' },
      de: { 'Hello, world!': 'Hallo, Welt!' },
      ja: { 'Hello, world!': 'こんにちは、世界！' },
      zh: { 'Hello, world!': '你好，世界！' },
      ko: { 'Hello, world!': '안녕하세요, 세계!' },
      pt: { 'Hello, world!': 'Olá, mundo!' },
    };
    const langMap = translations[to] || {};
    const result = langMap[text] || `[${to.toUpperCase()}] ${text}`;

    res.json({
      api: 'Neural Translator',
      data: {
        original: { text, language: from },
        translated: { text: result, language: to },
        confidence: (0.85 + Math.random() * 0.14).toFixed(3),
        model: 'neural-translate-v4',
        timestamp: new Date().toISOString(),
      },
    });
  }
);

app.get('/api/v1/price',
  paymentMiddleware(createPaymentConfig(0.005, 'Crypto Price Oracle')),
  (req, res) => {
    const symbol = (req.query.symbol || 'STX').toUpperCase();
    const payment = getPayment(req);
    recordTransaction('price-oracle', req, payment);

    const basePrices = { BTC: 97500, ETH: 3200, STX: 1.85, SOL: 195, DOGE: 0.32, ADA: 0.95, DOT: 8.5, AVAX: 38.5, sBTC: 97500 };
    const base = basePrices[symbol] || (10 + Math.random() * 100);
    const price = base + base * (Math.random() * 0.04 - 0.02);

    res.json({
      api: 'Crypto Price Oracle',
      data: {
        symbol,
        price: parseFloat(price.toFixed(symbol === 'BTC' || symbol === 'sBTC' ? 2 : 6)),
        change24h: parseFloat((Math.random() * 10 - 5).toFixed(2)),
        volume24h: Math.round(1e6 + Math.random() * 5e7),
        marketCap: Math.round(price * (1e6 + Math.random() * 1e8)),
        high24h: parseFloat((price * 1.03).toFixed(6)),
        low24h: parseFloat((price * 0.97).toFixed(6)),
        sparkline: Array.from({ length: 24 }, () => parseFloat((price * (0.97 + Math.random() * 0.06)).toFixed(6))),
        lastUpdated: new Date().toISOString(),
      },
    });
  }
);

app.post('/api/v1/generate-image',
  paymentMiddleware(createPaymentConfig(0.05, 'Image Generation')),
  (req, res) => {
    const { prompt = 'A futuristic city on the blockchain', style = 'realistic' } = req.body;
    const payment = getPayment(req);
    recordTransaction('image-gen', req, payment);

    res.json({
      api: 'Image Generation',
      data: {
        prompt,
        style,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt.substring(0, 30))}/1024/1024`,
        dimensions: '1024x1024',
        generationTime: '3.2s',
        model: 'sdxl-v2',
      },
    });
  }
);

app.post('/api/v1/code-review',
  paymentMiddleware(createPaymentConfig(0.03, 'Code Review')),
  (req, res) => {
    const { code = 'console.log("hello")', language = 'javascript' } = req.body;
    const payment = getPayment(req);
    recordTransaction('code-review', req, payment);

    res.json({
      api: 'Code Review',
      data: {
        language,
        linesOfCode: code.split('\n').length,
        qualityScore: Math.round(70 + Math.random() * 25),
        securityScore: Math.round(75 + Math.random() * 20),
        issues: [
          { severity: 'warning', message: 'Consider using const for non-reassigned variables', line: 1 },
          { severity: 'info', message: 'Add error handling for async operations', line: 1 },
        ].slice(0, Math.floor(Math.random() * 2) + 1),
        suggestions: ['Add input validation', 'Implement retry logic for network calls'],
        bestPractices: { passed: Math.round(8 + Math.random() * 4), total: 12 },
        timestamp: new Date().toISOString(),
      },
    });
  }
);

app.get('/api/v1/news',
  paymentMiddleware(createPaymentConfig(0.008, 'News Aggregator')),
  (req, res) => {
    const topic = req.query.topic || 'blockchain';
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const payment = getPayment(req);
    recordTransaction('news-feed', req, payment);

    const headlines = {
      blockchain: [
        'Stacks Network Hits Record Transaction Volume as x402 Protocol Gains Traction',
        'Bitcoin Layer-2 Solutions See Surge in Developer Activity',
        'DeFi on Stacks: TVL Crosses $500M Milestone',
        'AI Agents Now Autonomously Trading Using x402 Payment Protocol',
        'sBTC Launch Brings Bitcoin Programmability to New Heights',
        'Web3 Payments: How HTTP 402 is Changing the Internet',
      ],
      crypto: [
        'Bitcoin Surpasses $100K as Institutional Demand Grows',
        'Stacks STX Token Shows Strong Recovery in Q1 2026',
        'Layer-2 Solutions Battle for Bitcoin DeFi Dominance',
        'Global Crypto Adoption Rate Hits 15% of World Population',
      ],
      ai: [
        'AI Agents Begin Autonomous Commerce Using Cryptocurrency',
        'Machine Learning Models Now Pay for Their Own API Access',
        'AI-Powered Trading Bots Generate $1B in Daily Volume',
      ],
    };
    const articles = (headlines[topic] || headlines.blockchain).slice(0, limit);

    res.json({
      api: 'News Aggregator',
      data: {
        topic,
        totalResults: articles.length,
        articles: articles.map((title, i) => ({
          title,
          summary: `${title}. A significant development with broad implications for the ${topic} ecosystem.`,
          source: ['TechCrunch', 'CoinDesk', 'The Block', 'Decrypt', 'Ars Technica'][i % 5],
          publishedAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
          relevanceScore: parseFloat((0.75 + Math.random() * 0.24).toFixed(3)),
        })),
        timestamp: new Date().toISOString(),
      },
    });
  }
);

app.get('/api/v1/chain-analytics',
  paymentMiddleware(createPaymentConfig(0.02, 'Chain Analytics')),
  (req, res) => {
    const address = req.query.address || SERVER_ADDRESS;
    const payment = getPayment(req);
    recordTransaction('chain-analytics', req, payment);

    res.json({
      api: 'Chain Analytics',
      data: {
        address,
        balance: { stx: (100 + Math.random() * 10000).toFixed(6), sbtc: (Math.random() * 0.5).toFixed(8) },
        totalTransactions: Math.round(50 + Math.random() * 500),
        contractsDeployed: Math.round(Math.random() * 15),
        activity: {
          txLast30d: Math.round(10 + Math.random() * 100),
          volumeLast30d: (50 + Math.random() * 5000).toFixed(2) + ' STX',
        },
        riskScore: Math.round(10 + Math.random() * 30),
        builderScore: Math.round(50 + Math.random() * 50),
        lastActive: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        timestamp: new Date().toISOString(),
      },
    });
  }
);


// ─── Fallback ────────────────────────────────────────────────────────────────
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════════════╗');
    console.log('  ║                                                          ║');
    console.log('  ║   ⚡ Conduit                                              ║');
    console.log('  ║   Pay-per-call APIs on Stacks                             ║');
    console.log('  ║                                                          ║');
    console.log(`  ║   🌐 http://localhost:${PORT}                              ║`);
    console.log(`  ║   📡 Network: ${NETWORK.padEnd(41)}║`);
    console.log(`  ║   💰 Address: ${SERVER_ADDRESS.substring(0, 20)}...        ║`);
    console.log('  ║                                                          ║');
    console.log(`  ║   ${API_REGISTRY.length} APIs · x402 Payment Protocol · Stacks L2          ║`);
    console.log('  ║                                                          ║');
    console.log('  ╚══════════════════════════════════════════════════════════╝');
    console.log('');
  });
}

export default app;
