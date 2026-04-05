/**
 * Conduit — Frontend
 * Full-stack logic for the x402 API marketplace and Nakamoto Signaling.
 * This version uses the global StacksConnect/Connect object from CDN for better SES compatibility.
 */

const NETWORK = {
    version: 1, // Mainnet
    chainId: 1,
    coreApiUrl: 'https://api.mainnet.hiro.so'
};

const getStacksConnect = () => {
    return window.StacksConnect || window.Connect || {};
};

function getUserSession() {
    const connect = getStacksConnect();
    const appConfig = new connect.AppConfig(['store_write', 'publish_data']);
    return new connect.UserSession({ appConfig });
}

let catalog = [];

// ── Initialization ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    console.log('Conduit App Initialized (Nakamoto Ready)');
    initAuth();
    loadCatalog();
    loadStats();
    initCheckIn();
    initFilters();
    initPlayground();
});

function initAuth() {
    const userSession = getUserSession();
    if (userSession.isUserSignedIn()) {
        const userData = userSession.loadUserData();
        showConnected(userData);
    }
}

function showConnected(userData) {
    const btnText = document.getElementById('walletBtnText');
    const addr = userData.profile.stxAddress.mainnet;
    if (btnText) {
        btnText.textContent = addr.substring(0, 5) + '...' + addr.substring(addr.length - 4);
    }
    document.getElementById('connectWalletBtn')?.classList.add('connected');
}

// ── Catalog ───────────────────────────────────────────────────────────────
const API_REGISTRY_FALLBACK = [
  { id: 'weather', name: 'Weather Intelligence', category: 'Data', icon: '🌤️', pricing: { amount: '0.01' }, method: 'GET', latency: '~120ms', uptime: '99.9%', description: 'Real-time weather data and climate analytics.' },
  { id: 'sentiment', name: 'Sentiment Analysis', category: 'AI/ML', icon: '🧠', pricing: { amount: '0.02' }, method: 'POST', latency: '~250ms', uptime: '99.7%', description: 'Emotion detection for text and reviews.' },
  { id: 'translate', name: 'Neural Translator', category: 'AI/ML', icon: '🌍', pricing: { amount: '0.015' }, method: 'POST', latency: '~180ms', uptime: '99.8%', description: 'Context-aware translation across 100+ languages.' },
  { id: 'price-oracle', name: 'Crypto Price Oracle', category: 'DeFi', icon: '📊', pricing: { amount: '0.005' }, method: 'GET', latency: '~80ms', uptime: '99.95%', description: 'Real-time prices for 5000+ tokens.' },
  { id: 'image-gen', name: 'Image Generation', category: 'AI/ML', icon: '🎨', pricing: { amount: '0.05' }, method: 'POST', latency: '~3.5s', uptime: '99.5%', description: 'Diffusion models for high-quality images.' },
  { id: 'code-review', name: 'Code Review', category: 'Developer', icon: '🔍', pricing: { amount: '0.03' }, method: 'POST', latency: '~1.2s', uptime: '99.6%', description: 'Automated security auditing and scoring.' },
  { id: 'news-feed', name: 'News Aggregator', category: 'Data', icon: '📰', pricing: { amount: '0.008' }, method: 'GET', latency: '~200ms', uptime: '99.8%', description: 'AI-curated news with relevance scoring.' },
  { id: 'chain-analytics', name: 'Chain Analytics', category: 'DeFi', icon: '⛓️', pricing: { amount: '0.02' }, method: 'GET', latency: '~350ms', uptime: '99.7%', description: 'Stacks blockchain intelligence and metrics.' }
];

async function loadCatalog() {
    try {
        const res = await fetch('/api/v1/discover');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            const data = await res.json();
            catalog = data.apis || API_REGISTRY_FALLBACK;
        } else {
            catalog = API_REGISTRY_FALLBACK;
        }
    } catch (e) {
        catalog = API_REGISTRY_FALLBACK;
    }
    renderCatalog(catalog);
}

function renderCatalog(apis) {
    const grid = document.getElementById('apiGrid');
    if (!grid) return;
    grid.innerHTML = apis.map(api => `
    <div class="api-card" data-category="${api.category}" data-endpoint="${api.endpoint || api.id}">
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
}

// ── Stats ─────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch('/api/v1/stats');
        if (res.ok) {
            const data = await res.json();
            const apiCount = document.getElementById('heroApiCount');
            if (apiCount && data.stats) apiCount.textContent = data.stats.totalAPIs;
        }
    } catch (e) {
        console.warn('Stats fetch failed');
    }
}

// ── Daily Check-In (Pulse Signaling) ──────────────────────────────────────
window.signalTransition = async function() {
    const connect = getStacksConnect();
    const userSession = getUserSession();
    
    if (!userSession.isUserSignedIn()) {
        alert("Please connect your wallet first.");
        if (window.connectWallet) {
            window.connectWallet();
        }
        return;
    }

    const btn = document.getElementById('btnCheckIn');
    const status = document.getElementById('checkInStatus');

    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<span>Signalling...</span>';
    status.textContent = 'Awaiting signature...';

    const contractAddr = 'SP2F500B8DTRK1EANJQ054BRAB8DDKN6QCMXGNFBT';

    try {
        if (!connect.openContractCall) {
            throw new Error("Stacks Connect library is missing openContractCall function.");
        }

        await connect.openContractCall({
            contractAddress: contractAddr,
            contractName: 'fee-free-txn-v2',
            functionName: 'signal-participation',
            functionArgs: [],
            network: NETWORK,
            appDetails: {
                name: 'Conduit Market',
                icon: window.location.origin + '/favicon.ico',
            },
            userSession,
            onFinish: (data) => {
                status.className = 'ci-status success';
                status.textContent = 'Success! Transition Signal Sent.';
                btn.innerHTML = '<span>Signal Sent ✅</span>';
                console.log('Signal TX:', data.txId);
            },
            onCancel: () => {
                btn.disabled = false;
                btn.innerHTML = '<span>Signal Transition Now</span>';
                status.textContent = 'Cancelled.';
            }
        });
    } catch (e) {
        console.error('Signal Error:', e);
        status.textContent = 'Error: ' + e.message;
        btn.disabled = false;
        btn.innerHTML = '<span>Try Again</span>';
    }
};

function initCheckIn() {
    const btn = document.getElementById('btnCheckIn');
    if (btn) {
        btn.onclick = window.signalTransition;
    }
}

// ── Other UI Logic ────────────────────────────────────────────────────────
function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const cards = document.querySelectorAll('.api-card');
            cards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

function initPlayground() {
    const btn = document.getElementById('pgSend');
    if (btn) {
        btn.addEventListener('click', async () => {
            const endpoint = document.getElementById('pgEndpoint').value;
            const status = document.getElementById('pgStatus');
            const resPanel = document.getElementById('pgResponseCode');
            
            status.textContent = 'Calling...';
            try {
                const res = await fetch(`/api/v1/${endpoint}`, {
                    method: endpoint === 'sentiment' || endpoint === 'translate' || endpoint === 'image-gen' || endpoint === 'code-review' ? 'POST' : 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    body: (endpoint === 'sentiment') ? JSON.stringify({ text: "x402 is amazing!" }) : undefined
                });
                
                const data = await res.json();
                status.textContent = res.status + ' ' + res.statusText;
                resPanel.innerHTML = `<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`;
            } catch (e) {
                status.textContent = 'Error';
                if (resPanel) resPanel.innerHTML = `<pre><code>${e.message}</code></pre>`;
            }
        });
    }
}
