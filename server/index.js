/**
 * x402 Agent Marketplace - Main Server
 * 
 * An API marketplace where AI agents can autonomously discover, pay for,
 * and consume APIs using the x402 payment protocol on Stacks blockchain.
 * 
 * No API keys. No subscriptions. Just HTTP requests and instant crypto payments.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  paymentMiddleware,
  getPayment,
  paymentRateLimit,
  tieredPayment,
  STXtoMicroSTX,
} from 'x402-stacks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3402;

// ─── Configuration ───────────────────────────────────────────────────────────
const NETWORK = process.env.STACKS_NETWORK || 'testnet';
const SERVER_ADDRESS = process.env.SERVER_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://x402-facilitator.x402stacks.xyz';

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── In-Memory Data Stores ───────────────────────────────────────────────────
const transactionLog = [];
const apiUsageStats = {};

// ─── API Registry (Discoverable Catalog) ─────────────────────────────────────
const API_CATALOG = [
  {
    id: 'weather',
    name: 'Weather Intelligence API',
    description: 'Real-time weather data, forecasts, and climate analytics for any location worldwide.',
    category: 'Data',
    icon: '🌤️',
    pricing: { amount: '0.01', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/weather',
    method: 'GET',
    params: { location: 'string (city name or coordinates)' },
    responseFormat: 'JSON',
    avgLatency: '120ms',
    uptime: '99.9%',
    totalRequests: 15420,
  },
  {
    id: 'sentiment',
    name: 'AI Sentiment Analysis',
    description: 'Advanced NLP-powered sentiment analysis for text, social media posts, and reviews.',
    category: 'AI/ML',
    icon: '🧠',
    pricing: { amount: '0.02', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/sentiment',
    method: 'POST',
    params: { text: 'string (text to analyze)', language: 'string (optional, default: en)' },
    responseFormat: 'JSON',
    avgLatency: '250ms',
    uptime: '99.7%',
    totalRequests: 8930,
  },
  {
    id: 'translate',
    name: 'Universal Translator',
    description: 'Neural machine translation supporting 100+ languages with context-aware translations.',
    category: 'AI/ML',
    icon: '🌍',
    pricing: { amount: '0.015', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/translate',
    method: 'POST',
    params: { text: 'string', from: 'string (language code)', to: 'string (language code)' },
    responseFormat: 'JSON',
    avgLatency: '180ms',
    uptime: '99.8%',
    totalRequests: 12100,
  },
  {
    id: 'price-oracle',
    name: 'Crypto Price Oracle',
    description: 'Real-time cryptocurrency prices, historical data, and market analytics for 5000+ tokens.',
    category: 'DeFi',
    icon: '📊',
    pricing: { amount: '0.005', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/price',
    method: 'GET',
    params: { symbol: 'string (e.g., BTC, ETH, STX)', currency: 'string (optional, default: USD)' },
    responseFormat: 'JSON',
    avgLatency: '80ms',
    uptime: '99.95%',
    totalRequests: 45200,
  },
  {
    id: 'image-gen',
    name: 'AI Image Generator',
    description: 'Generate stunning images from text prompts using state-of-the-art diffusion models.',
    category: 'AI/ML',
    icon: '🎨',
    pricing: { amount: '0.05', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/generate-image',
    method: 'POST',
    params: { prompt: 'string', style: 'string (optional: realistic|anime|abstract)', size: 'string (optional: 512x512|1024x1024)' },
    responseFormat: 'JSON (base64 image)',
    avgLatency: '3500ms',
    uptime: '99.5%',
    totalRequests: 3200,
  },
  {
    id: 'code-review',
    name: 'AI Code Review',
    description: 'Automated code review with security analysis, best practices, and optimization suggestions.',
    category: 'Developer Tools',
    icon: '🔍',
    pricing: { amount: '0.03', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/code-review',
    method: 'POST',
    params: { code: 'string', language: 'string (e.g., javascript, python, clarity)' },
    responseFormat: 'JSON',
    avgLatency: '1200ms',
    uptime: '99.6%',
    totalRequests: 5600,
  },
  {
    id: 'news-feed',
    name: 'Smart News Aggregator',
    description: 'AI-curated news feed with topic filtering, summarization, and relevance scoring.',
    category: 'Data',
    icon: '📰',
    pricing: { amount: '0.008', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/news',
    method: 'GET',
    params: { topic: 'string', limit: 'number (optional, default: 10)' },
    responseFormat: 'JSON',
    avgLatency: '200ms',
    uptime: '99.8%',
    totalRequests: 22100,
  },
  {
    id: 'blockchain-analytics',
    name: 'Stacks Chain Analytics',
    description: 'Deep analytics for the Stacks blockchain — wallet profiles, contract analysis, and on-chain metrics.',
    category: 'DeFi',
    icon: '⛓️',
    pricing: { amount: '0.02', currency: 'STX', model: 'per-request' },
    endpoint: '/api/v1/chain-analytics',
    method: 'GET',
    params: { address: 'string (Stacks address)', type: 'string (optional: profile|transactions|contracts)' },
    responseFormat: 'JSON',
    avgLatency: '350ms',
    uptime: '99.7%',
    totalRequests: 7800,
  },
];

// Helper to create payment config
function createPaymentConfig(amountSTX, description) {
  return {
    amount: STXtoMicroSTX(amountSTX),
    payTo: SERVER_ADDRESS,
    network: NETWORK,
    facilitatorUrl: FACILITATOR_URL,
    description: description,
  };
}

// Log transaction helper
function logTransaction(apiId, req, payment) {
  const entry = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    apiId,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    payment: payment ? {
      txId: payment.tx_id || payment.txId || 'demo',
      status: payment.status || 'settled',
    } : { txId: 'demo-mode', status: 'demo' },
  };
  transactionLog.push(entry);
  if (transactionLog.length > 1000) transactionLog.shift();

  // Update usage stats
  if (!apiUsageStats[apiId]) {
    apiUsageStats[apiId] = { totalCalls: 0, totalRevenue: 0 };
  }
  apiUsageStats[apiId].totalCalls++;
  
  return entry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FREE ENDPOINTS (Discovery Layer)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/discover
 * Free endpoint - Returns the full API catalog for agents to discover available services
 */
app.get('/api/v1/discover', (req, res) => {
  res.json({
    marketplace: 'x402 Agent Marketplace',
    protocol: 'x402-stacks',
    version: '2.0',
    network: NETWORK,
    paymentAddress: SERVER_ADDRESS,
    totalAPIs: API_CATALOG.length,
    categories: [...new Set(API_CATALOG.map(a => a.category))],
    apis: API_CATALOG.map(api => ({
      id: api.id,
      name: api.name,
      description: api.description,
      category: api.category,
      icon: api.icon,
      pricing: api.pricing,
      endpoint: api.endpoint,
      method: api.method,
      params: api.params,
      responseFormat: api.responseFormat,
      avgLatency: api.avgLatency,
      uptime: api.uptime,
    })),
    instructions: {
      step1: 'Browse this catalog to find APIs you need',
      step2: 'Send a request to the API endpoint',
      step3: 'If 402 Payment Required is returned, sign and send payment',
      step4: 'Receive your data — no API keys, no accounts needed',
      tip: 'Use x402-stacks npm package with axios interceptor for automatic payments',
    },
  });
});

/**
 * GET /api/v1/stats
 * Free endpoint - Returns marketplace statistics
 */
app.get('/api/v1/stats', (req, res) => {
  const totalTransactions = transactionLog.length;
  const last24h = transactionLog.filter(
    t => new Date(t.timestamp) > new Date(Date.now() - 86400000)
  ).length;

  res.json({
    marketplace: 'x402 Agent Marketplace',
    stats: {
      totalAPIs: API_CATALOG.length,
      totalTransactions,
      transactionsLast24h: last24h,
      categories: [...new Set(API_CATALOG.map(a => a.category))].length,
      apiUsage: Object.entries(apiUsageStats).map(([id, stats]) => ({
        apiId: id,
        ...stats,
      })),
      recentTransactions: transactionLog.slice(-10).reverse(),
    },
  });
});

/**
 * GET /api/v1/health
 * Free endpoint - Health check
 */
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    protocol: 'x402-stacks',
    network: NETWORK,
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// PAID ENDPOINTS (Protected by x402 Payment Middleware)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/weather
 * 💰 0.01 STX per request
 * Returns weather data for a given location
 */
app.get(
  '/api/v1/weather',
  paymentMiddleware(createPaymentConfig(0.01, 'Weather Intelligence API - real-time weather data')),
  (req, res) => {
    const location = req.query.location || 'New York';
    const payment = getPayment(req);
    logTransaction('weather', req, payment);

    // Simulated weather data (in production, this would call a real weather API)
    const weatherData = generateWeatherData(location);
    
    res.json({
      success: true,
      api: 'Weather Intelligence API',
      payment: { protocol: 'x402-stacks', status: 'paid' },
      data: weatherData,
    });
  }
);

/**
 * POST /api/v1/sentiment
 * 💰 0.02 STX per request
 * Analyzes sentiment of provided text
 */
app.post(
  '/api/v1/sentiment',
  paymentMiddleware(createPaymentConfig(0.02, 'AI Sentiment Analysis')),
  (req, res) => {
    const text = req.body.text || 'x402 is revolutionizing payments on the internet!';
    const payment = getPayment(req);
    logTransaction('sentiment', req, payment);

    const analysis = analyzeSentiment(text);
    
    res.json({
      success: true,
      api: 'AI Sentiment Analysis',
      payment: { protocol: 'x402-stacks', status: 'paid' },
      data: analysis,
    });
  }
);

/**
 * POST /api/v1/translate
 * 💰 0.015 STX per request
 * Translates text between languages
 */
app.post(
  '/api/v1/translate',
  paymentMiddleware(createPaymentConfig(0.015, 'Universal Translator')),
  (req, res) => {
    const { text = 'Hello, world!', from = 'en', to = 'es' } = req.body;
    const payment = getPayment(req);
    logTransaction('translate', req, payment);

    const translation = translateText(text, from, to);
    
    res.json({
      success: true,
      api: 'Universal Translator',
      payment: { protocol: 'x402-stacks', status: 'paid' },
      data: translation,
    });
  }
);

/**
 * GET /api/v1/price
 * 💰 0.005 STX per request
 * Returns cryptocurrency price data
 */
app.get(
  '/api/v1/price',
  paymentMiddleware(createPaymentConfig(0.005, 'Crypto Price Oracle')),
  (req, res) => {
    const symbol = req.query.symbol || 'STX';
    const currency = req.query.currency || 'USD';
    const payment = getPayment(req);
    logTransaction('price-oracle', req, payment);

    const priceData = getCryptoPrice(symbol, currency);
    
    res.json({
      success: true,
      api: 'Crypto Price Oracle',
      payment: { protocol: 'x402-stacks', status: 'paid' },
      data: priceData,
    });
  }
);

/**
 * POST /api/v1/generate-image
 * 💰 0.05 STX per request
 * Generates an image from text prompt
 */
app.post(
  '/api/v1/generate-image',
  paymentMiddleware(createPaymentConfig(0.05, 'AI Image Generator')),
  (req, res) => {
    const { prompt = 'A beautiful sunset over the Stacks blockchain', style = 'realistic' } = req.body;
    const payment = getPayment(req);
    logTransaction('image-gen', req, payment);

    res.json({
      success: true,
      api: 'AI Image Generator',
      payment: { protocol: 'x402-stacks', status: 'paid' },
      data: {
        prompt,
        style,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1024/1024`,
        dimensions: '1024x1024',
        generationTime: '3.2s',
        model: 'stable-diffusion-xl',
      },
    });
  }
);

/**
 * POST /api/v1/code-review
 * 💰 0.03 STX per request
 * Reviews code for issues and improvements
 */
app.post(
  '/api/v1/code-review',
  paymentMiddleware(createPaymentConfig(0.03, 'AI Code Review')),
  (req, res) => {
    const { code = 'console.log("hello")', language = 'javascript' } = req.body;
    const payment = getPayment(req);
    logTransaction('code-review', req, payment);

    const review = reviewCode(code, language);
    
    res.json({
      success: true,
      api: 'AI Code Review',
      payment: { protocol: 'x402-stacks', status: 'paid' },
      data: review,
    });
  }
);

/**
 * GET /api/v1/news
 * 💰 0.008 STX per request
 * Returns curated news articles
 */
app.get(
  '/api/v1/news',
  paymentMiddleware(createPaymentConfig(0.008, 'Smart News Aggregator')),
  (req, res) => {
    const topic = req.query.topic || 'blockchain';
    const limit = parseInt(req.query.limit) || 5;
    const payment = getPayment(req);
    logTransaction('news-feed', req, payment);

    const news = generateNews(topic, limit);
    
    res.json({
      success: true,
      api: 'Smart News Aggregator',
      payment: { protocol: 'x402-stacks', status: 'paid' },
      data: news,
    });
  }
);

/**
 * GET /api/v1/chain-analytics
 * 💰 0.02 STX per request
 * Returns Stacks blockchain analytics
 */
app.get(
  '/api/v1/chain-analytics',
  paymentMiddleware(createPaymentConfig(0.02, 'Stacks Chain Analytics')),
  (req, res) => {
    const address = req.query.address || SERVER_ADDRESS;
    const type = req.query.type || 'profile';
    const payment = getPayment(req);
    logTransaction('blockchain-analytics', req, payment);

    const analytics = getChainAnalytics(address, type);
    
    res.json({
      success: true,
      api: 'Stacks Chain Analytics',
      payment: { protocol: 'x402-stacks', status: 'paid' },
      data: analytics,
    });
  }
);


// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATED DATA GENERATORS
// (In production, these would be real API integrations)
// ═══════════════════════════════════════════════════════════════════════════════

function generateWeatherData(location) {
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorm', 'Snowy', 'Windy', 'Clear'];
  const temp = Math.round(15 + Math.random() * 25);
  return {
    location,
    current: {
      temperature: { celsius: temp, fahrenheit: Math.round(temp * 9/5 + 32) },
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      humidity: Math.round(40 + Math.random() * 50),
      windSpeed: { kmh: Math.round(5 + Math.random() * 30), mph: Math.round(3 + Math.random() * 18) },
      uvIndex: Math.round(1 + Math.random() * 10),
      pressure: Math.round(1000 + Math.random() * 30),
      visibility: Math.round(5 + Math.random() * 15),
    },
    forecast: Array.from({ length: 5 }, (_, i) => ({
      day: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
      high: Math.round(temp + Math.random() * 8 - 4),
      low: Math.round(temp - 5 + Math.random() * 4 - 2),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      precipChance: Math.round(Math.random() * 100),
    })),
    timestamp: new Date().toISOString(),
    source: 'x402 Weather Intelligence API',
  };
}

function analyzeSentiment(text) {
  const words = text.toLowerCase().split(/\s+/);
  const positiveWords = ['great', 'good', 'amazing', 'excellent', 'love', 'revolutionary', 'innovative', 'best', 'awesome', 'fantastic', 'revolutionizing'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'broken', 'fail', 'crash'];
  
  let positive = 0, negative = 0;
  words.forEach(w => {
    if (positiveWords.some(pw => w.includes(pw))) positive++;
    if (negativeWords.some(nw => w.includes(nw))) negative++;
  });
  
  const total = words.length || 1;
  const score = ((positive - negative) / total * 5 + 0.5).toFixed(3);
  const sentiment = score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral';
  
  return {
    text: text.substring(0, 500),
    sentiment,
    confidence: Math.min(0.99, 0.6 + Math.abs(score) * 0.3).toFixed(3),
    score: parseFloat(score),
    emotions: {
      joy: sentiment === 'positive' ? (0.5 + Math.random() * 0.4).toFixed(3) : (Math.random() * 0.3).toFixed(3),
      anger: sentiment === 'negative' ? (0.3 + Math.random() * 0.4).toFixed(3) : (Math.random() * 0.1).toFixed(3),
      sadness: sentiment === 'negative' ? (0.2 + Math.random() * 0.3).toFixed(3) : (Math.random() * 0.15).toFixed(3),
      surprise: (Math.random() * 0.4).toFixed(3),
      trust: sentiment === 'positive' ? (0.4 + Math.random() * 0.4).toFixed(3) : (Math.random() * 0.3).toFixed(3),
    },
    wordCount: words.length,
    model: 'sentiment-xl-v3',
    timestamp: new Date().toISOString(),
  };
}

function translateText(text, from, to) {
  const translations = {
    'es': { 'Hello, world!': '¡Hola, mundo!', default: `[Traducción] ${text}` },
    'fr': { 'Hello, world!': 'Bonjour, le monde!', default: `[Traduction] ${text}` },
    'de': { 'Hello, world!': 'Hallo, Welt!', default: `[Übersetzung] ${text}` },
    'ja': { 'Hello, world!': 'こんにちは、世界！', default: `[翻訳] ${text}` },
    'zh': { 'Hello, world!': '你好，世界！', default: `[翻译] ${text}` },
    'ko': { 'Hello, world!': '안녕하세요, 세계!', default: `[번역] ${text}` },
    'ar': { 'Hello, world!': 'مرحبا بالعالم!', default: `[ترجمة] ${text}` },
    'pt': { 'Hello, world!': 'Olá, mundo!', default: `[Tradução] ${text}` },
  };
  
  const langMap = translations[to] || { default: `[Translated to ${to}] ${text}` };
  const result = langMap[text] || langMap.default;
  
  return {
    original: { text, language: from },
    translated: { text: result, language: to },
    confidence: (0.85 + Math.random() * 0.14).toFixed(3),
    alternativeTranslations: [],
    model: 'neural-translate-v4',
    timestamp: new Date().toISOString(),
  };
}

function getCryptoPrice(symbol, currency) {
  const basePrices = {
    BTC: 97500, ETH: 3200, STX: 1.85, SOL: 195, DOGE: 0.32,
    ADA: 0.95, DOT: 8.50, LINK: 22.40, AVAX: 38.50, MATIC: 0.85,
    sBTC: 97500, USDCx: 1.00,
  };
  const basePrice = basePrices[symbol.toUpperCase()] || (10 + Math.random() * 100);
  const variation = basePrice * (Math.random() * 0.04 - 0.02);
  const price = basePrice + variation;
  
  return {
    symbol: symbol.toUpperCase(),
    currency: currency.toUpperCase(),
    price: parseFloat(price.toFixed(symbol === 'BTC' || symbol === 'sBTC' ? 2 : 6)),
    change24h: parseFloat((Math.random() * 10 - 5).toFixed(2)),
    changePercent24h: parseFloat((Math.random() * 10 - 5).toFixed(2)),
    volume24h: Math.round(1000000 + Math.random() * 50000000),
    marketCap: Math.round(price * (1000000 + Math.random() * 100000000)),
    high24h: parseFloat((price * 1.03).toFixed(6)),
    low24h: parseFloat((price * 0.97).toFixed(6)),
    sparkline: Array.from({ length: 24 }, () => parseFloat((price * (0.97 + Math.random() * 0.06)).toFixed(6))),
    lastUpdated: new Date().toISOString(),
    source: 'x402 Crypto Price Oracle',
  };
}

function reviewCode(code, language) {
  const issues = [
    { severity: 'warning', message: 'Consider using const instead of let for variables that are not reassigned', line: 1 },
    { severity: 'info', message: 'Add error handling for edge cases', line: 1 },
    { severity: 'suggestion', message: 'Consider adding JSDoc documentation for better maintainability', line: 1 },
  ];
  
  return {
    language,
    codeLength: code.length,
    linesOfCode: code.split('\n').length,
    issues: issues.slice(0, Math.floor(Math.random() * 3) + 1),
    qualityScore: Math.round(70 + Math.random() * 25),
    suggestions: [
      'Add input validation for user-provided data',
      'Consider implementing retry logic for network calls',
      'Extract magic numbers into named constants',
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    securityScore: Math.round(75 + Math.random() * 20),
    bestPractices: { passed: Math.round(8 + Math.random() * 4), total: 12 },
    model: 'code-review-xl-v2',
    timestamp: new Date().toISOString(),
  };
}

function generateNews(topic, limit) {
  const headlines = {
    blockchain: [
      'Stacks Network Hits Record Transaction Volume as x402 Protocol Gains Traction',
      'Bitcoin Layer-2 Solutions See Surge in Developer Activity',
      'New x402 Standard Promises to Revolutionize API Monetization',
      'DeFi on Stacks: TVL Crosses $500M Milestone',
      'AI Agents Now Autonomously Trading Using x402 Payment Protocol',
      'sBTC Launch Brings Bitcoin Programmability to New Heights',
      'Web3 Payments: How HTTP 402 is Changing the Internet',
      'Major Enterprises Adopt x402 for Machine-to-Machine Payments',
    ],
    crypto: [
      'Bitcoin Surpasses $100K as Institutional Demand Grows',
      'Stacks STX Token Shows Strong Recovery in Q1 2026',
      'Layer-2 Solutions Battle for Bitcoin DeFi Dominance',
      'Global Crypto Adoption Rate Hits 15% of World Population',
      'New Regulatory Framework Provides Clarity for DeFi Protocols',
    ],
    ai: [
      'AI Agents Begin Autonomous Commerce Using Cryptocurrency',
      'GPT-5 Integration with Blockchain Opens New Possibilities',
      'Machine Learning Models Now Pay for Their Own API Access',
      'AI-Powered Trading Bots Generate $1B in Daily Volume',
      'Decentralized AI Marketplace Sees Exponential Growth',
    ],
  };
  
  const articles = headlines[topic] || headlines.blockchain;
  
  return {
    topic,
    totalResults: articles.length,
    articles: articles.slice(0, limit).map((title, i) => ({
      title,
      summary: `${title}. This development marks a significant milestone in the ${topic} space, with implications for developers, investors, and the broader ecosystem.`,
      source: ['TechCrunch', 'CoinDesk', 'The Block', 'Decrypt', 'Ars Technica'][i % 5],
      publishedAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      relevanceScore: parseFloat((0.75 + Math.random() * 0.24).toFixed(3)),
      url: `https://example.com/news/${topic}/${i + 1}`,
    })),
    timestamp: new Date().toISOString(),
  };
}

function getChainAnalytics(address, type) {
  return {
    address,
    type,
    overview: {
      balance: { stx: (100 + Math.random() * 10000).toFixed(6), sbtc: (Math.random() * 0.5).toFixed(8) },
      totalTransactions: Math.round(50 + Math.random() * 500),
      contractsDeployed: Math.round(Math.random() * 15),
      nftHoldings: Math.round(Math.random() * 25),
      firstSeen: '2024-03-15T10:30:00Z',
      lastActive: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    },
    activity: {
      transactionsLast30d: Math.round(10 + Math.random() * 100),
      volumeLast30d: (50 + Math.random() * 5000).toFixed(2) + ' STX',
      topInteractions: [
        { contract: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.univ2-router', calls: Math.round(Math.random() * 50) },
        { contract: 'SP2C2YFP12AJZB1KHMG0ANV9CRBMTXNZZ9MPJRK6S.arkadiko-stake', calls: Math.round(Math.random() * 30) },
      ],
    },
    riskScore: Math.round(10 + Math.random() * 30),
    builderScore: Math.round(50 + Math.random() * 50),
    timestamp: new Date().toISOString(),
    source: 'x402 Stacks Chain Analytics',
  };
}


// ─── Fallback Route ──────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║                                                          ║');
  console.log('  ║   ⚡ x402 Agent Marketplace                              ║');
  console.log('  ║   Powered by x402-stacks on the Stacks blockchain        ║');
  console.log('  ║                                                          ║');
  console.log(`  ║   🌐 http://localhost:${PORT}                              ║`);
  console.log(`  ║   📡 Network: ${NETWORK.padEnd(41)}║`);
  console.log(`  ║   💰 Payment Address: ${SERVER_ADDRESS.substring(0, 20)}...       ║`);
  console.log('  ║                                                          ║');
  console.log('  ║   Free Endpoints:                                        ║');
  console.log('  ║     GET  /api/v1/discover  — Browse API catalog          ║');
  console.log('  ║     GET  /api/v1/stats     — Marketplace stats           ║');
  console.log('  ║     GET  /api/v1/health    — Health check                ║');
  console.log('  ║                                                          ║');
  console.log(`  ║   Paid APIs: ${API_CATALOG.length} endpoints protected by HTTP 402          ║`);
  console.log('  ║                                                          ║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log('');
});

export default app;
