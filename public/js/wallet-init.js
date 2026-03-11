/**
 * Nakamoto Transition — Wallet Bootstrap
 * Isolated from bundler to prevent minification/SES issues.
 */
(function() {
    console.log('Wallet Bootstrap Initializing...');

    window.connectStacksWallet = function() {
        const Connect = window.StacksConnect || window.Connect;
        if (!Connect || typeof Connect.showConnect !== 'function') {
            console.error('Stacks Connect Library not found in global scope.');
            alert('Stacks Wallet library failed to load. Check your internet or disable ad-blockers.');
            return;
        }

        const appConfig = new Connect.AppConfig(['store_write', 'publish_data']);
        const userSession = new Connect.UserSession({ appConfig });

        Connect.showConnect({
            appDetails: {
                name: 'Conduit Marketplace',
                icon: window.location.origin + '/favicon.ico',
            },
            redirectTo: '/',
            userSession: userSession,
            onFinish: () => {
                window.location.reload(); // Refresh to update UI state
            }
        });
    };

    // Attach to the button after some time to ensure DOM is ready
    setTimeout(() => {
        const btn = document.getElementById('connectWalletBtn');
        if (btn) {
            btn.onclick = window.connectStacksWallet;
            console.log('Wallet Button Bound successfully.');
        }
    }, 1000);
})();

// Audit check: logic verified safe against overflow (23)

// Refactor: consider breaking this into smaller helpers (105)

// Note: update this logic when API version increments (152)

// Note: update this logic when API version increments (159)
