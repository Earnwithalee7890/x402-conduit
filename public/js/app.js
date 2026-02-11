/**
 * x402 Agent Marketplace — Frontend Application
 * Handles API catalog rendering, live demo, stats, and UI interactions
 */

// ─── State ──────────────────────────────────────────────────────────────────
let apiCatalog = [];
let currentFilter = 'all';
let statsInterval = null;

// ─── Initialize ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    loadAPICatalog();
    initFilters();
    initDemo();
    initCodeTabs();
    loadStats();
    startStatsPolling();
    initScrollAnimations();
});

// ─── Navbar ─────────────────────────────────────────────────────────────────
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('navToggle');
    const links = document.querySelector('.nav-links');

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    if (toggle) {
        toggle.addEventListener('click', () => {
            links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
            if (links.style.display === 'flex') {
                links.style.position = 'absolute';
                links.style.top = '100%';
                links.style.left = '0';
                links.style.right = '0';
                links.style.flexDirection = 'column';
                links.style.background = 'rgba(10, 11, 15, 0.95)';
                links.style.padding = '20px';
                links.style.borderBottom = '1px solid rgba(148, 163, 184, 0.1)';
                links.style.gap = '16px';
            }
        });
    }
}

// ─── API Catalog ────────────────────────────────────────────────────────────
async function loadAPICatalog() {
    try {
        const response = await fetch('/api/v1/discover');
        const data = await response.json();
        apiCatalog = data.apis;
        renderAPICatalog(apiCatalog);
        document.getElementById('heroApiCount').textContent = apiCatalog.length;
    } catch (err) {
        console.error('Failed to load API catalog:', err);
        // Fallback static catalog
        renderFallbackCatalog();
    }
}

function renderAPICatalog(apis) {
    const grid = document.getElementById('apiGrid');
    if (!grid) return;

    grid.innerHTML = apis.map(api => `
    <div class="api-card" data-category="${api.category}" data-api-id="${api.id}">
      <div class="api-card-header">
        <div class="api-card-icon">${api.icon}</div>
        <span class="api-card-category">${api.category}</span>
      </div>
      <h3 class="api-card-name">${api.name}</h3>
      <p class="api-card-description">${api.description}</p>
      <div class="api-card-meta">
        <div class="api-card-price">
          <span class="api-card-price-value">${api.pricing.amount}</span>
          <span class="api-card-price-unit">${api.pricing.currency} / ${api.pricing.model}</span>
        </div>
        <span class="api-card-method ${api.method === 'POST' ? 'post' : ''}">${api.method}</span>
      </div>
      <div class="api-card-stats">
        <span class="api-card-stat">⚡ <strong>${api.avgLatency}</strong></span>
        <span class="api-card-stat">✅ <strong>${api.uptime}</strong></span>
      </div>
    </div>
  `).join('');

    // Add click handlers to scroll to demo
    grid.querySelectorAll('.api-card').forEach(card => {
        card.addEventListener('click', () => {
            const apiId = card.dataset.apiId;
            const demoSelect = document.getElementById('demoEndpoint');

            // Try to find matching option
            const options = demoSelect.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === apiId) {
                    demoSelect.selectedIndex = i;
                    break;
                }
            }

            // Scroll to demo
            document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function renderFallbackCatalog() {
    apiCatalog = [
        { id: 'weather', name: 'Weather Intelligence API', description: 'Real-time weather data and forecasts', category: 'Data', icon: '🌤️', pricing: { amount: '0.01', currency: 'STX', model: 'per-request' }, method: 'GET', avgLatency: '120ms', uptime: '99.9%' },
        { id: 'sentiment', name: 'AI Sentiment Analysis', description: 'NLP-powered sentiment analysis', category: 'AI/ML', icon: '🧠', pricing: { amount: '0.02', currency: 'STX', model: 'per-request' }, method: 'POST', avgLatency: '250ms', uptime: '99.7%' },
        { id: 'price-oracle', name: 'Crypto Price Oracle', description: 'Real-time crypto prices', category: 'DeFi', icon: '📊', pricing: { amount: '0.005', currency: 'STX', model: 'per-request' }, method: 'GET', avgLatency: '80ms', uptime: '99.95%' },
    ];
    renderAPICatalog(apiCatalog);
}

// ─── Filters ────────────────────────────────────────────────────────────────
function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            currentFilter = filter;

            const cards = document.querySelectorAll('.api-card');
            cards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = '';
                    card.style.animation = 'fadeInUp 0.3s ease';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// ─── Live Demo ──────────────────────────────────────────────────────────────
function initDemo() {
    const sendBtn = document.getElementById('demoSend');
    const select = document.getElementById('demoEndpoint');

    if (sendBtn) {
        sendBtn.addEventListener('click', executeDemoRequest);
    }

    if (select) {
        select.addEventListener('change', updateDemoCode);
        updateDemoCode(); // Initial
    }
}

function updateDemoCode() {
    const select = document.getElementById('demoEndpoint');
    const requestPanel = document.getElementById('demoRequest');
    const value = select.value;

    const endpoints = {
        discover: {
            code: `<span class="code-comment">// GET /api/v1/discover — FREE (no payment required)</span>
<span class="code-keyword">const</span> response = <span class="code-keyword">await</span> fetch(<span class="code-string">'/api/v1/discover'</span>);
<span class="code-keyword">const</span> catalog = <span class="code-keyword">await</span> response.<span class="code-fn">json</span>();

<span class="code-comment">// Returns full API catalog with pricing</span>
console.<span class="code-fn">log</span>(catalog.apis.length + <span class="code-string">' APIs available'</span>);`,
        },
        weather: {
            code: `<span class="code-comment">// GET /api/v1/weather — 💰 0.01 STX per request</span>
<span class="code-keyword">const</span> response = <span class="code-keyword">await</span> fetch(
  <span class="code-string">'/api/v1/weather?location=Tokyo'</span>
);

<span class="code-comment">// Without payment: HTTP 402 Payment Required</span>
<span class="code-comment">// With x402-stacks: auto-pays 0.01 STX → gets data</span>
<span class="code-keyword">const</span> weather = <span class="code-keyword">await</span> response.<span class="code-fn">json</span>();`,
        },
        price: {
            code: `<span class="code-comment">// GET /api/v1/price — 💰 0.005 STX per request</span>
<span class="code-keyword">const</span> response = <span class="code-keyword">await</span> fetch(
  <span class="code-string">'/api/v1/price?symbol=STX'</span>
);

<span class="code-comment">// Cheapest API in the marketplace!</span>
<span class="code-keyword">const</span> price = <span class="code-keyword">await</span> response.<span class="code-fn">json</span>();`,
        },
        news: {
            code: `<span class="code-comment">// GET /api/v1/news — 💰 0.008 STX per request</span>
<span class="code-keyword">const</span> response = <span class="code-keyword">await</span> fetch(
  <span class="code-string">'/api/v1/news?topic=blockchain&limit=5'</span>
);

<span class="code-comment">// AI-curated news articles with relevance scoring</span>
<span class="code-keyword">const</span> news = <span class="code-keyword">await</span> response.<span class="code-fn">json</span>();`,
        },
        stats: {
            code: `<span class="code-comment">// GET /api/v1/stats — FREE (no payment required)</span>
<span class="code-keyword">const</span> response = <span class="code-keyword">await</span> fetch(<span class="code-string">'/api/v1/stats'</span>);
<span class="code-keyword">const</span> stats = <span class="code-keyword">await</span> response.<span class="code-fn">json</span>();

<span class="code-comment">// Marketplace analytics & recent transactions</span>
console.<span class="code-fn">log</span>(stats);`,
        },
        health: {
            code: `<span class="code-comment">// GET /api/v1/health — FREE (no payment required)</span>
<span class="code-keyword">const</span> response = <span class="code-keyword">await</span> fetch(<span class="code-string">'/api/v1/health'</span>);
<span class="code-keyword">const</span> health = <span class="code-keyword">await</span> response.<span class="code-fn">json</span>();

<span class="code-comment">// Quick health check for monitoring</span>`,
        },
    };

    const ep = endpoints[value] || endpoints.discover;
    requestPanel.innerHTML = `<pre><code>${ep.code}</code></pre>`;
}

async function executeDemoRequest() {
    const select = document.getElementById('demoEndpoint');
    const responsePanel = document.getElementById('demoResponse');
    const statusBadge = document.getElementById('demoStatus');
    const sendBtn = document.getElementById('demoSend');
    const value = select.value;

    // Loading state
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span>Sending...</span>';
    statusBadge.className = 'demo-status';
    statusBadge.textContent = '...';
    responsePanel.innerHTML = '<pre><code class="loading-shimmer" style="display:block;height:200px;border-radius:8px;"></code></pre>';

    // Map select values to actual endpoints
    const endpointMap = {
        discover: '/api/v1/discover',
        weather: '/api/v1/weather?location=Tokyo',
        price: '/api/v1/price?symbol=STX',
        news: '/api/v1/news?topic=blockchain&limit=3',
        stats: '/api/v1/stats',
        health: '/api/v1/health',
    };

    const freeEndpoints = ['discover', 'stats', 'health'];
    const isPaid = !freeEndpoints.includes(value);
    const url = endpointMap[value] || endpointMap.discover;

    try {
        // For paid endpoints in demo, we'll explain the 402 flow
        const startTime = performance.now();
        const response = await fetch(url);
        const elapsed = Math.round(performance.now() - startTime);

        if (response.status === 402) {
            // Show the 402 response
            const paymentRequired = await response.json();
            statusBadge.className = 'demo-status status-402';
            statusBadge.textContent = '402 Payment Required';

            responsePanel.innerHTML = `<pre><code><span class="code-comment">// ⚡ HTTP 402 — Payment Required!</span>
<span class="code-comment">// The server requires ${getAPIPrice(value)} STX to access this endpoint</span>
<span class="code-comment">// With x402-stacks, this payment happens automatically</span>
<span class="code-comment">// Response time: ${elapsed}ms</span>

${syntaxHighlightJSON(paymentRequired)}</code></pre>`;
        } else {
            const data = await response.json();
            statusBadge.className = 'demo-status status-200';
            statusBadge.textContent = `200 OK · ${elapsed}ms`;

            // Truncate large responses
            const displayData = truncateObject(data, 3);
            responsePanel.innerHTML = `<pre><code><span class="code-comment">// ✅ ${response.status} OK — Response received (${elapsed}ms)</span>
${isPaid ? '<span class="code-comment">// 💰 In production: ' + getAPIPrice(value) + ' STX would be auto-paid via x402</span>' : '<span class="code-comment">// 🆓 Free endpoint — no payment required</span>'}

${syntaxHighlightJSON(displayData)}</code></pre>`;
        }
    } catch (err) {
        statusBadge.className = 'demo-status';
        statusBadge.textContent = 'Error';
        responsePanel.innerHTML = `<pre><code><span class="code-comment">// ❌ Error: ${err.message}</span></code></pre>`;
    }

    // Reset button
    sendBtn.disabled = false;
    sendBtn.innerHTML = `<span>Send Request</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;

    // Refresh stats
    loadStats();
}

function getAPIPrice(id) {
    const prices = { weather: '0.01', sentiment: '0.02', translate: '0.015', 'price-oracle': '0.005', price: '0.005', 'image-gen': '0.05', 'code-review': '0.03', news: '0.008', 'blockchain-analytics': '0.02' };
    return prices[id] || '0.01';
}

// ─── JSON Syntax Highlighting ───────────────────────────────────────────────
function syntaxHighlightJSON(obj) {
    const json = JSON.stringify(obj, null, 2);
    return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?/g, (match) => {
            let cls = 'code-string'; // strings
            if (/:$/.test(match)) {
                cls = 'code-var'; // keys
                match = match.replace(/"/g, '').replace(/:$/, ':');
                return `<span class="${cls}">"${match.slice(0, -1)}"</span>:`;
            }
            return `<span class="${cls}">${match}</span>`;
        })
        .replace(/\b(true|false)\b/g, '<span class="code-keyword">$1</span>')
        .replace(/\b(null)\b/g, '<span class="code-comment">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>');
}

function truncateObject(obj, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
        if (Array.isArray(obj)) return obj.length > 2 ? [obj[0], `... ${obj.length - 1} more`] : obj;
        if (typeof obj === 'object' && obj !== null) return '{ ... }';
        return obj;
    }

    if (Array.isArray(obj)) {
        const items = obj.slice(0, 3).map(item => truncateObject(item, maxDepth, currentDepth + 1));
        if (obj.length > 3) items.push(`... ${obj.length - 3} more items`);
        return items;
    }

    if (typeof obj === 'object' && obj !== null) {
        const result = {};
        const keys = Object.keys(obj);
        keys.slice(0, 12).forEach(key => {
            result[key] = truncateObject(obj[key], maxDepth, currentDepth + 1);
        });
        if (keys.length > 12) result['...'] = `${keys.length - 12} more fields`;
        return result;
    }

    if (typeof obj === 'string' && obj.length > 150) {
        return obj.substring(0, 150) + '...';
    }

    return obj;
}

// ─── Code Tabs ──────────────────────────────────────────────────────────────
function initCodeTabs() {
    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            document.getElementById('codeClient').style.display = target === 'client' ? '' : 'none';
            document.getElementById('codeServer').style.display = target === 'server' ? '' : 'none';
        });
    });
}

// ─── Stats ──────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const response = await fetch('/api/v1/stats');
        const data = await response.json();

        document.getElementById('statTotalAPIs').textContent = data.stats.totalAPIs;
        document.getElementById('statTotalTx').textContent = data.stats.totalTransactions;

        // Calculate total volume
        const volume = data.stats.apiUsage.reduce((acc, api) => acc + api.totalCalls * 0.015, 0);
        document.getElementById('statRevenue').textContent = volume.toFixed(3) + ' STX';

        // Render recent transactions
        renderTransactions(data.stats.recentTransactions);
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

function renderTransactions(transactions) {
    const table = document.getElementById('transactionsTable');
    if (!table || !transactions.length) return;

    const header = `
    <div class="transaction-row transaction-row--header">
      <span>API</span>
      <span>Time</span>
      <span>Status</span>
      <span>TX ID</span>
    </div>`;

    const rows = transactions.map(tx => {
        const time = new Date(tx.timestamp).toLocaleTimeString();
        return `
      <div class="transaction-row">
        <span><strong>${tx.apiId}</strong></span>
        <span>${time}</span>
        <span class="tx-status">${tx.payment?.status || 'demo'}</span>
        <span class="tx-id">${tx.payment?.txId ? tx.payment.txId.substring(0, 16) + '...' : 'demo'}</span>
      </div>`;
    }).join('');

    table.innerHTML = header + rows;
}

function startStatsPolling() {
    statsInterval = setInterval(loadStats, 15000);
}

// ─── Scroll Animations ─────────────────────────────────────────────────────
function initScrollAnimations() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.how-card, .api-card, .stat-card, .section-header').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}
