import { AppConfig, UserSession, showConnect, openContractCall, openSTXTransfer } from '@stacks/connect';
import { STACKS_MAINNET } from '@stacks/network';

const NETWORK = STACKS_MAINNET;
import { uintCV, stringAsciiCV, noneCV } from '@stacks/transactions';

/**
 * Conduit — Frontend
 */

let catalog = [];
let userData;

// Initialize user session
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initWallet(); // Added wallet init
    loadCatalog();
    initFilters();
    initPlayground();
    initProvider();
    initCodeTabs();
    loadStats();
    setInterval(loadStats, 12000);
    initAnimations();
});

// ── Wallet ────────────────────────────────────────────────────────────────

function initWallet() {
    const btn = document.getElementById('connectWalletBtn');
    const btnText = document.getElementById('walletBtnText');

    // Check if already signed in
    if (userSession.isUserSignedIn()) {
        const data = userSession.loadUserData();
        showConnected(data);
    } else if (userSession.isSignInPending()) {
        userSession.handlePendingSignIn().then(data => {
            showConnected(data);
        });
    }

    if (btn) {
        btn.addEventListener('click', () => {
            if (userSession.isUserSignedIn()) {
                // Sign out logic
                userSession.signUserOut();
                window.location.reload();
            } else {
                // Sign in logic
                showConnect({
                    appDetails: {
                        name: 'Conduit',
                        icon: window.location.origin + '/favicon.ico',
                    },
                    redirectTo: '/',
                    onFinish: () => {
                        const data = userSession.loadUserData();
                        showConnected(data);
                    },
                    userSession,
                });
            }
        });
    }

    function showConnected(data) {
        userData = data;
        const address = userData.profile.stxAddress.mainnet; // Mainnet address
        if (address) {
            btnText.textContent = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
            btn.classList.add('connected');
            window.userAddress = address;
            console.log('Wallet connected:', address);
        }
    }
}

// ── Navbar ────────────────────────────────────────────────────────────────
function initNavbar() {
    const nav = document.getElementById('navbar');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    });

    if (toggle && links) {
        toggle.addEventListener('click', () => {
            const open = links.style.display === 'flex';
            links.style.display = open ? '' : 'flex';
            if (!open) {
                Object.assign(links.style, {
                    position: 'absolute', top: '100%', left: '0', right: '0',
                    flexDirection: 'column', background: 'rgba(6,7,10,0.95)',
                    padding: '20px', borderBottom: '1px solid rgba(148,163,184,0.08)', gap: '14px',
                });
            }
        });
    }
}

// ── Catalog ───────────────────────────────────────────────────────────────
async function loadCatalog() {
    try {
        const res = await fetch('/api/v1/discover');
        const data = await res.json();
        catalog = data.apis;
        renderCatalog(catalog);
    } catch (e) {
        console.error('Catalog load failed:', e);
    }
}

function renderCatalog(apis) {
    const grid = document.getElementById('apiGrid');
    if (!grid) return;
    grid.innerHTML = apis.map(api => `
    <div class="api-card" data-category="${api.category}" data-endpoint="${api.endpoint}">
      <div class="api-card-top">
        <div class="api-card-icon">${api.icon}</div>
        <span class="api-card-badge">${api.category}</span>
      </div>
      <h3 class="api-card-name">${api.name}</h3>
      <p class="api-card-desc">${api.description}</p>
      <div class="api-card-footer">
        <div class="api-card-price">
          <span class="api-price-val">${api.pricing.amount}</span>
          <span class="api-price-unit">STX / call</span>
        </div>
        <span class="api-card-method ${api.method === 'POST' ? 'post' : ''}">${api.method}</span>
      </div>
      <div class="api-card-stats">
        <span class="api-card-stat">⚡ <strong>${api.latency}</strong></span>
        <span class="api-card-stat">✅ <strong>${api.uptime}</strong></span>
      </div>
    </div>
  `).join('');

    grid.querySelectorAll('.api-card').forEach(card => {
        card.addEventListener('click', () => {
            document.getElementById('playground').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ── Filters ───────────────────────────────────────────────────────────────
function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            document.querySelectorAll('.api-card').forEach(card => {
                const show = f === 'all' || card.dataset.category === f;
                card.style.display = show ? '' : 'none';
                if (show) card.style.animation = 'fadeUp 0.3s var(--ease) forwards';
            });
        });
    });
}

// ── Playground ────────────────────────────────────────────────────────────
function initPlayground() {
    const sendBtn = document.getElementById('pgSend');
    const select = document.getElementById('pgEndpoint');
    if (sendBtn) sendBtn.addEventListener('click', runPlayground);
    if (select) { select.addEventListener('change', updateRequestCode); updateRequestCode(); }
}

function updateRequestCode() {
    const val = document.getElementById('pgEndpoint').value;
    const panel = document.getElementById('pgRequestCode');
    const snippets = {
        discover: `<span class="syn-comment">// GET /api/v1/discover — Free</span>\n<span class="syn-keyword">const</span> res = <span class="syn-keyword">await</span> <span class="syn-fn">fetch</span>(<span class="syn-string">'/api/v1/discover'</span>);\n<span class="syn-keyword">const</span> catalog = <span class="syn-keyword">await</span> res.<span class="syn-fn">json</span>();\nconsole.<span class="syn-fn">log</span>(catalog.totalAPIs, <span class="syn-string">'APIs available'</span>);`,
        stats: `<span class="syn-comment">// GET /api/v1/stats — Free</span>\n<span class="syn-keyword">const</span> res = <span class="syn-keyword">await</span> <span class="syn-fn">fetch</span>(<span class="syn-string">'/api/v1/stats'</span>);\n<span class="syn-keyword">const</span> stats = <span class="syn-keyword">await</span> res.<span class="syn-fn">json</span>();`,
        health: `<span class="syn-comment">// GET /api/v1/health — Free</span>\n<span class="syn-keyword">const</span> res = <span class="syn-keyword">await</span> <span class="syn-fn">fetch</span>(<span class="syn-string">'/api/v1/health'</span>);\n<span class="syn-keyword">const</span> health = <span class="syn-keyword">await</span> res.<span class="syn-fn">json</span>();`,
        weather: `<span class="syn-comment">// GET /api/v1/weather — 0.01 STX per call</span>\n<span class="syn-keyword">const</span> res = <span class="syn-keyword">await</span> <span class="syn-fn">fetch</span>(<span class="syn-string">'/api/v1/weather?location=Tokyo'</span>);\n<span class="syn-comment">// Without payment: HTTP 402 Payment Required</span>\n<span class="syn-comment">// With x402-stacks interceptor: auto-pay → 200 OK</span>`,
        price: `<span class="syn-comment">// GET /api/v1/price — 0.005 STX per call</span>\n<span class="syn-keyword">const</span> res = <span class="syn-keyword">await</span> <span class="syn-fn">fetch</span>(<span class="syn-string">'/api/v1/price?symbol=BTC'</span>);\n<span class="syn-comment">// Returns x402 payment challenge</span>`,
        news: `<span class="syn-comment">// GET /api/v1/news — 0.008 STX per call</span>\n<span class="syn-keyword">const</span> res = <span class="syn-keyword">await</span> <span class="syn-fn">fetch</span>(<span class="syn-string">'/api/v1/news?topic=blockchain&limit=5'</span>);\n<span class="syn-comment">// x402 interceptor handles payment automatically</span>`,
        chain: `<span class="syn-comment">// GET /api/v1/chain-analytics — 0.02 STX per call</span>\n<span class="syn-keyword">const</span> res = <span class="syn-keyword">await</span> <span class="syn-fn">fetch</span>(<span class="syn-string">'/api/v1/chain-analytics?address=ST1PQH...'</span>);\n<span class="syn-comment">// Deep on-chain analytics for any Stacks address</span>`,
    };
    panel.innerHTML = `<pre><code>${snippets[val] || snippets.discover}</code></pre>`;
}

async function runPlayground() {
    const val = document.getElementById('pgEndpoint').value;
    const resPanel = document.getElementById('pgResponseCode');
    const status = document.getElementById('pgStatus');
    const btn = document.getElementById('pgSend');

    if (!userSession || !userSession.isUserSignedIn()) {
        const isPaid = ['weather', 'price', 'news', 'chain'].includes(val);
        if (isPaid) {
            alert("Please connect your wallet first to use paid endpoints.");
            document.getElementById('connectWalletBtn').click();
            return;
        }
    }

    btn.disabled = true;
    btn.innerHTML = '<span>Sending...</span>';
    status.className = 'pg-status';
    status.textContent = '...';
    resPanel.innerHTML = '<pre><code class="shimmer" style="display:block;height:200px;border-radius:8px;"></code></pre>';

    const endpoints = {
        discover: '/api/v1/discover',
        stats: '/api/v1/stats',
        health: '/api/v1/health',
        weather: '/api/v1/weather?location=Tokyo',
        price: '/api/v1/price?symbol=BTC',
        news: '/api/v1/news?topic=blockchain&limit=3',
        chain: '/api/v1/chain-analytics?address=SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R',
    };

    const url = endpoints[val] || endpoints.discover;
    const t0 = performance.now();

    try {
        const res = await fetch(url);
        const ms = Math.round(performance.now() - t0);
        const data = await res.json();

        if (res.status === 402) {
            status.className = 'pg-status s-402';
            status.textContent = `402 · ${ms}ms`;

            resPanel.innerHTML = `<pre><code><span class="syn-comment">// HTTP 402 — Payment Required</span>
<span class="syn-comment">// The x402 protocol returns payment requirements:</span>
<span class="syn-comment">// Initiating Stacks Transaction...</span>

${highlightJSON(data)}</code></pre>`;

            if (data.payment && data.payment.amount && data.payment.payTo) {
                const amount = parseInt(data.payment.amount);
                const recipient = data.payment.payTo;
                const memo = data.payment.description || 'API Payment';

                openSTXTransfer({
                    recipient: recipient,
                    amount: amount,
                    memo: memo,
                    network: NETWORK,
                    appDetails: {
                        name: 'Conduit Market',
                        icon: window.location.origin + '/favicon.ico',
                    },
                    onFinish: (data) => {
                        console.log('Payment Sent:', data);
                        status.className = 'pg-status s-200';
                        status.textContent = `PAID · ${ms}ms`;
                        resPanel.innerHTML = `<pre><code><span class="syn-comment">// Payment Successful!</span>
<span class="syn-comment">// Transaction ID: ${data.txId}</span>
<span class="syn-comment">// Retrying request with payment proof...</span>

<span class="syn-keyword">const</span> response = {
  status: <span class="syn-number">200</span>,
  data: {
    <span class="syn-comment">// Simulated data unlocked by payment</span>
    success: <span class="syn-keyword">true</span>,
    access: <span class="syn-string">"granted"</span>
  }
}</code></pre>`;
                    },
                    onCancel: () => {
                        console.log('Payment Cancelled');
                        resPanel.innerHTML += `\n<span class="syn-comment">// Payment Cancelled by User</span>`;
                    }
                });
            }

        } else {
            status.className = 'pg-status s-200';
            status.textContent = `${res.status} OK · ${ms}ms`;
            resPanel.innerHTML = `<pre><code><span class="syn-comment">// ${res.status} OK — ${ms}ms</span>

${highlightJSON(trimObj(data, 3))}</code></pre>`;
        }
    } catch (e) {
        status.className = 'pg-status s-err';
        status.textContent = 'Error';
        resPanel.innerHTML = `<pre><code><span class="syn-comment">// Error: ${e.message}</span></code></pre>`;
    }

    btn.disabled = false;
    btn.innerHTML = '<span>Send</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
    loadStats();
}

function highlightJSON(obj) {
    return JSON.stringify(obj, null, 2)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?/g, m => {
            if (/:$/.test(m)) return `<span class="syn-var">${m.slice(0, -1)}</span>:`;
            return `<span class="syn-string">${m}</span>`;
        })
        .replace(/\b(true|false)\b/g, '<span class="syn-keyword">$1</span>')
        .replace(/\b(null)\b/g, '<span class="syn-comment">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="syn-number">$1</span>');
}

function trimObj(obj, depth, d = 0) {
    if (d >= depth) {
        if (Array.isArray(obj)) return obj.length > 2 ? [obj[0], `...${obj.length - 1} more`] : obj;
        if (typeof obj === 'object' && obj !== null) return '...';
        return obj;
    }
    if (Array.isArray(obj)) {
        const items = obj.slice(0, 3).map(i => trimObj(i, depth, d + 1));
        if (obj.length > 3) items.push(`...${obj.length - 3} more`);
        return items;
    }
    if (typeof obj === 'object' && obj !== null) {
        const r = {};
        const keys = Object.keys(obj);
        keys.slice(0, 10).forEach(k => r[k] = trimObj(obj[k], depth, d + 1));
        if (keys.length > 10) r['...'] = `${keys.length - 10} more`;
        return r;
    }
    if (typeof obj === 'string' && obj.length > 120) return obj.substring(0, 120) + '...';
    return obj;
}

// ── Code Tabs ─────────────────────────────────────────────────────────────
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

// ── Stats ─────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch('/api/v1/stats');
        const data = await res.json();
        document.getElementById('statAPIs').textContent = data.stats.totalAPIs;
        document.getElementById('statTx').textContent = data.stats.totalTransactions;
        const vol = data.stats.apiUsage.reduce((a, u) => a + u.totalCalls * 0.015, 0);
        document.getElementById('statVolume').textContent = vol.toFixed(3) + ' STX';
        renderTx(data.stats.recentTransactions);
    } catch (e) { /* silent */ }
}

function renderTx(txs) {
    const body = document.getElementById('txBody');
    if (!body || !txs || !txs.length) return;
    const head = `<div class="tx-row tx-row--head"><span>API</span><span>Time</span><span>Status</span><span>TX ID</span></div>`;
    const rows = txs.map(tx => {
        const time = new Date(tx.timestamp).toLocaleTimeString();
        const txId = tx.payment?.txId || 'pending';
        return `<div class="tx-row">
      <span><strong>${tx.apiId}</strong></span>
      <span>${time}</span>
      <span class="tx-badge">${tx.payment?.status || 'settled'}</span>
      <span class="tx-id">${txId.length > 16 ? txId.substring(0, 16) + '...' : txId}</span>
    </div>`;
    }).join('');
    body.innerHTML = head + rows;
}

// ── Provider Dashboard ────────────────────────────────────────────────────
function initProvider() {
    const btn = document.getElementById('btnRegisterApi');
    const status = document.getElementById('regStatus');

    if (btn) {
        btn.addEventListener('click', async () => {
            if (!userSession || !userSession.isUserSignedIn()) {
                alert("Please connect your wallet first.");
                document.getElementById('connectWalletBtn').click();
                return;
            }

            const name = document.getElementById('regName').value;
            const desc = document.getElementById('regDesc').value;
            const endpoint = document.getElementById('regEndpoint').value;
            const method = document.getElementById('regMethod').value;
            const price = parseFloat(document.getElementById('regPrice').value);
            const category = document.getElementById('regCategory').value;
            const contractAddr = document.getElementById('regContractAddr').value;

            if (!name || !desc || !endpoint || isNaN(price) || price <= 0) {
                status.className = 'reg-status error';
                status.textContent = 'Please fill in all fields with valid data.';
                return;
            }

            const [contractAddress, contractName] = contractAddr.includes('.') ? contractAddr.split('.') : [contractAddr, 'api-registry'];

            try {
                // Modified to match the new simplified signature: (name, description, endpoint, price, category)
                const functionArgs = [
                    stringAsciiCV(name),
                    stringAsciiCV(desc),
                    stringAsciiCV(endpoint),
                    uintCV(Math.floor(price * 1000000)), // to microSTX
                    stringAsciiCV(category)
                ];

                const options = {
                    contractAddress: contractAddress,
                    contractName: contractName || 'api-registry',
                    functionName: 'register-api',
                    functionArgs: functionArgs,
                    network: NETWORK,
                    appDetails: {
                        name: 'Conduit Market',
                        icon: window.location.origin + '/favicon.ico',
                    },
                    onFinish: (data) => {
                        console.log('Mainnet Transaction Success:', data);
                        status.className = 'reg-status success';
                        status.textContent = `Success! Tx: ${data.txId.substring(0, 10)}...`;
                        document.getElementById('regName').value = '';
                    },
                    onCancel: () => {
                        status.className = 'reg-status error';
                        status.textContent = 'Transaction cancelled.';
                    },
                };

                console.log('Finalizing Mainnet Contract Call...', {
                    contract: `${options.contractAddress}.${options.contractName}`,
                    function: options.functionName,
                    args: functionArgs
                });

                await openContractCall(options);

            } catch (e) {
                console.error('Contract Call Error:', e);
                status.className = 'reg-status error';
                status.textContent = 'Error: ' + e.message;
            }
        });
    }
}

// ── Scroll Animations ─────────────────────────────────────────────────────
function initAnimations() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('[data-animate]').forEach(el => obs.observe(el));
}
