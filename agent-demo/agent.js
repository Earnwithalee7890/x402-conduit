/**
 * Conduit — AI Agent Demo
 * 
 * This script demonstrates how an AI agent can autonomously:
 * 1. Discover available APIs in the marketplace
 * 2. Select the best API for its task
 * 3. Pay for API access using STX via x402 protocol
 * 4. Consume the API data
 * 
 * Usage: node agent-demo/agent.js
 * 
 * Note: For actual payments, you need a funded Stacks mainnet wallet.
 * This demo shows the discovery flow and the 402 payment challenge.
 */

import axios from 'axios';

// ─── Configuration ──────────────────────────────────────────────────────────
const MARKETPLACE_URL = process.env.MARKETPLACE_URL || 'http://localhost:3402';

// For production with real payments, you would use:
// import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';
// const account = privateKeyToAccount(process.env.PRIVATE_KEY, 'mainnet');
// const api = wrapAxiosWithPayment(axios.create({ baseURL: MARKETPLACE_URL }), account);

const api = axios.create({ baseURL: MARKETPLACE_URL });

// ─── Colors for terminal output ─────────────────────────────────────────────
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
};

function log(emoji, message, color = colors.reset) {
    console.log(`  ${emoji}  ${color}${message}${colors.reset}`);
}

function header(title) {
    console.log('');
    console.log(`  ${colors.bgMagenta}${colors.bright} ${title} ${colors.reset}`);
    console.log('');
}

function divider() {
    console.log(`  ${colors.dim}${'─'.repeat(60)}${colors.reset}`);
}

// ─── Agent Tasks ────────────────────────────────────────────────────────────

/**
 * Phase 1: Discovery
 * The agent discovers what APIs are available and their pricing
 */
async function discoverAPIs() {
    header('PHASE 1: API DISCOVERY');
    log('🔍', 'Discovering available APIs in the x402 marketplace...', colors.cyan);

    try {
        const response = await api.get('/api/v1/discover');
        const { apis, marketplace, network, totalAPIs } = response.data;

        log('✅', `Connected to: ${marketplace}`, colors.green);
        log('🌐', `Network: ${network}`, colors.blue);
        log('📦', `Total APIs available: ${totalAPIs}`, colors.blue);
        console.log('');

        // Display available APIs
        log('📋', 'Available APIs:', colors.bright);
        divider();

        apis.forEach((api, i) => {
            console.log(`  ${api.icon}  ${colors.bright}${api.name}${colors.reset}`);
            console.log(`      ${colors.dim}${api.description}${colors.reset}`);
            console.log(`      ${colors.magenta}💰 ${api.pricing.amount} ${api.pricing.currency}/${api.pricing.model}${colors.reset}  ${colors.cyan}${api.method} ${api.endpoint}${colors.reset}`);
            console.log(`      ${colors.dim}⚡ ${api.latency}  ✅ ${api.uptime}${colors.reset}`);
            console.log('');
        });

        divider();
        log('🤖', `Agent analysis: Found ${totalAPIs} APIs across ${[...new Set(apis.map(a => a.category))].join(', ')}`, colors.yellow);

        return apis;
    } catch (err) {
        log('❌', `Discovery failed: ${err.message}`, colors.red);
        return [];
    }
}

/**
 * Phase 2: API Selection
 * The agent selects the best API for its current task
 */
function selectAPI(apis, task) {
    header('PHASE 2: API SELECTION');
    log('🧠', `Agent task: "${task}"`, colors.yellow);

    // Simple keyword matching (a real agent would use NLP/LLM)
    const taskLower = task.toLowerCase();
    const keywords = {
        weather: ['weather', 'temperature', 'forecast', 'climate'],
        sentiment: ['sentiment', 'feeling', 'emotion', 'opinion', 'analyze text'],
        translate: ['translate', 'language', 'translation'],
        'price-oracle': ['price', 'crypto', 'market', 'token', 'btc', 'stx', 'eth'],
        'image-gen': ['image', 'picture', 'generate', 'create art', 'visual'],
        'code-review': ['code', 'review', 'security', 'bug', 'optimize'],
        'news-feed': ['news', 'article', 'headline', 'current events'],
        'blockchain-analytics': ['blockchain', 'chain', 'wallet', 'analytics', 'on-chain'],
    };

    let bestMatch = null;
    let bestScore = 0;

    for (const [apiId, words] of Object.entries(keywords)) {
        const score = words.reduce((acc, word) => acc + (taskLower.includes(word) ? 1 : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = apis.find(a => a.id === apiId);
        }
    }

    if (!bestMatch) {
        bestMatch = apis[0]; // Default to first API
        log('🔄', 'No strong match found, defaulting to first API', colors.dim);
    }

    log('✅', `Selected: ${bestMatch.icon} ${bestMatch.name}`, colors.green);
    log('💰', `Cost: ${bestMatch.pricing.amount} ${bestMatch.pricing.currency}`, colors.magenta);
    log('📡', `Endpoint: ${bestMatch.method} ${bestMatch.endpoint}`, colors.cyan);

    return bestMatch;
}

/**
 * Phase 3: Request & Payment
 * The agent requests the API, handles 402, and pays
 */
async function requestAPI(selectedAPI) {
    header('PHASE 3: REQUEST & PAYMENT');

    const endpoint = selectedAPI.endpoint;
    log('📡', `Sending request to ${selectedAPI.method} ${endpoint}...`, colors.cyan);

    try {
        // Build request based on API type
        let response;
        const startTime = Date.now();

        if (selectedAPI.method === 'GET') {
            const params = getDefaultParams(selectedAPI.id);
            const queryString = new URLSearchParams(params).toString();
            response = await api.get(`${endpoint}?${queryString}`);
        } else {
            const body = getDefaultBody(selectedAPI.id);
            response = await api.post(endpoint, body);
        }

        const elapsed = Date.now() - startTime;

        if (response.status === 200) {
            log('✅', `Response received! (${elapsed}ms)`, colors.green);
            return response.data;
        }
    } catch (err) {
        if (err.response && err.response.status === 402) {
            const elapsed = Date.now();
            log('🔒', 'HTTP 402 — Payment Required!', colors.yellow);
            log('💳', 'Server is requesting payment via x402 protocol', colors.yellow);

            // Display payment requirements
            const paymentInfo = err.response.data;
            console.log('');
            log('📋', 'Payment Requirements:', colors.bright);
            divider();
            console.log(`      ${colors.dim}${JSON.stringify(paymentInfo, null, 2)}${colors.reset}`);
            divider();

            console.log('');
            log('⚡', 'With x402-stacks library, this payment would be automatic!', colors.magenta);
            log('🔑', 'The axios interceptor would:', colors.dim);
            console.log(`      ${colors.dim}1. Parse the 402 response${colors.reset}`);
            console.log(`      ${colors.dim}2. Sign a STX transfer with the agent's private key${colors.reset}`);
            console.log(`      ${colors.dim}3. Submit to the facilitator for settlement${colors.reset}`);
            console.log(`      ${colors.dim}4. Retry the original request with payment proof${colors.reset}`);
            console.log(`      ${colors.dim}5. Return the data to the agent — all automatic!${colors.reset}`);

            return { paymentRequired: true, ...paymentInfo };
        }

        log('❌', `Request failed: ${err.message}`, colors.red);
        return null;
    }
}

/**
 * Phase 4: Process Results
 * The agent processes the data it received
 */
function processResults(data, selectedAPI) {
    header('PHASE 4: DATA PROCESSING');

    if (!data) {
        log('❌', 'No data to process', colors.red);
        return;
    }

    if (data.paymentRequired) {
        log('💡', 'To complete this flow with real payments:', colors.yellow);
        console.log('');
        console.log(`      ${colors.cyan}// agent.js — Full autonomous payment flow${colors.reset}`);
        console.log(`      ${colors.magenta}import${colors.reset} { wrapAxiosWithPayment, privateKeyToAccount } ${colors.magenta}from${colors.reset} ${colors.green}'x402-stacks'${colors.reset};`);
        console.log(`      ${colors.magenta}const${colors.reset} account = ${colors.blue}privateKeyToAccount${colors.reset}(process.env.PRIVATE_KEY, ${colors.green}'mainnet'${colors.reset});`);
        console.log(`      ${colors.magenta}const${colors.reset} api = ${colors.blue}wrapAxiosWithPayment${colors.reset}(axios.create({ baseURL }), account);`);
        console.log(`      ${colors.magenta}const${colors.reset} data = ${colors.magenta}await${colors.reset} api.get(${colors.green}'${selectedAPI.endpoint}'${colors.reset}); ${colors.dim}// Payment is automatic!${colors.reset}`);
        console.log('');
        return;
    }

    log('✅', `Successfully received data from ${selectedAPI.name}!`, colors.green);
    log('📊', 'Data preview:', colors.blue);
    divider();

    // Pretty print a relevant subset
    const preview = data.data || data;
    const previewStr = JSON.stringify(preview, null, 2).split('\n').slice(0, 20).join('\n');
    console.log(`${colors.dim}${previewStr}${colors.reset}`);

    if (JSON.stringify(preview, null, 2).split('\n').length > 20) {
        console.log(`${colors.dim}      ... (truncated)${colors.reset}`);
    }

    divider();
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function getDefaultParams(apiId) {
    const params = {
        weather: { location: 'Tokyo' },
        'price-oracle': { symbol: 'STX', currency: 'USD' },
        'news-feed': { topic: 'blockchain', limit: '3' },
        'blockchain-analytics': { address: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R', type: 'profile' },
    };
    return params[apiId] || {};
}

function getDefaultBody(apiId) {
    const bodies = {
        sentiment: { text: 'The x402 protocol is amazing! It makes API payments seamless and instant on Stacks.' },
        translate: { text: 'Hello, world!', from: 'en', to: 'es' },
        'image-gen': { prompt: 'A futuristic marketplace powered by blockchain', style: 'realistic' },
        'code-review': { code: 'const fetchData = async () => {\n  const res = await fetch("/api");\n  return res.json();\n}', language: 'javascript' },
    };
    return bodies[apiId] || {};
}

// ─── Main Agent Loop ────────────────────────────────────────────────────────

async function runAgent() {
    console.log('');
    console.log(`  ${colors.bgBlue}${colors.bright}                                                        ${colors.reset}`);
    console.log(`  ${colors.bgBlue}${colors.bright}    ⚡ Conduit — AI Agent Demo                           ${colors.reset}`);
    console.log(`  ${colors.bgBlue}${colors.bright}    Autonomous API Discovery & Payment on Stacks        ${colors.reset}`);
    console.log(`  ${colors.bgBlue}${colors.bright}                                                        ${colors.reset}`);
    console.log('');

    // Phase 1: Discover
    const apis = await discoverAPIs();
    if (apis.length === 0) {
        log('❌', 'No APIs found. Is the marketplace server running?', colors.red);
        log('💡', 'Start the server: npm run dev', colors.yellow);
        process.exit(1);
    }

    // Phase 2: Select
    const task = process.argv[2] || 'Get the current weather forecast for planning my day';
    const selectedAPI = selectAPI(apis, task);

    // Phase 3: Request & Pay
    const data = await requestAPI(selectedAPI);

    // Phase 4: Process
    processResults(data, selectedAPI);

    // Summary
    header('AGENT SUMMARY');
    log('🤖', 'Agent run complete!', colors.green);
    log('📋', `Task: "${task}"`, colors.dim);
    log('🔌', `API used: ${selectedAPI.name}`, colors.cyan);
    log('💰', `Cost: ${selectedAPI.pricing.amount} ${selectedAPI.pricing.currency}`, colors.magenta);
    log('🌐', `Protocol: x402-stacks (HTTP 402)`, colors.blue);
    console.log('');
    log('💡', 'Try different tasks:', colors.yellow);
    console.log(`      ${colors.dim}node agent-demo/agent.js "What's the price of Bitcoin?"${colors.reset}`);
    console.log(`      ${colors.dim}node agent-demo/agent.js "Translate hello to Spanish"${colors.reset}`);
    console.log(`      ${colors.dim}node agent-demo/agent.js "Analyze sentiment of this text"${colors.reset}`);
    console.log(`      ${colors.dim}node agent-demo/agent.js "Get blockchain news"${colors.reset}`);
    console.log(`      ${colors.dim}node agent-demo/agent.js "Review my code for bugs"${colors.reset}`);
    console.log('');
}

runAgent().catch(err => {
    console.error('Agent error:', err);
    process.exit(1);
});
