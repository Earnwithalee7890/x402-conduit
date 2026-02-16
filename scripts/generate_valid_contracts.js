const fs = require('fs');
const path = require('path');

// Target directory: directly in contracts/ to match traits
const targetDir = path.join(__dirname, '../contracts');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

console.log(`Generating contracts in: ${targetDir}`);

// Templates
const templates = {
    sip010: (name, symbol) => `;; ${name} (${symbol}) - SIP-010 Token
;; Mock implementation for Sandbox

(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token ${symbol.toLowerCase()})

(define-constant contract-owner tx-sender)

(define-read-only (get-name) (ok "${name}"))
(define-read-only (get-symbol) (ok "${symbol}"))
(define-read-only (get-decimals) (ok u6))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance ${symbol.toLowerCase()} who)))
(define-read-only (get-total-supply) (ok (ft-get-supply ${symbol.toLowerCase()})))
(define-read-only (get-token-uri) (ok none))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buf 34))))
    (begin
        (asserts! (is-eq tx-sender sender) (err u100))
        (try! (ft-transfer? ${symbol.toLowerCase()} amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) (err u101))
        (ft-mint? ${symbol.toLowerCase()} amount recipient)
    )
)
`,
    sip009: (name) => `;; ${name} - SIP-009 NFT
;; Mock implementation for Sandbox

(impl-trait .sip-009-trait-nft-standard.sip-009-trait)

(define-non-fungible-token ${name.toLowerCase().replace(/\s/g, '-')} uint)

(define-data-var last-id uint u0)
(define-constant contract-owner tx-sender)

(define-read-only (get-last-token-id) (ok (var-get last-id)))
(define-read-only (get-token-uri (id uint)) (ok none))
(define-read-only (get-owner (id uint)) (ok (nft-get-owner? ${name.toLowerCase().replace(/\s/g, '-')} id)))

(define-public (transfer (id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) (err u100))
        (nft-transfer? ${name.toLowerCase().replace(/\s/g, '-')} id sender recipient)
    )
)

(define-public (mint (recipient principal))
    (let ((next-id (+ (var-get last-id) u1)))
        (asserts! (is-eq tx-sender contract-owner) (err u101))
        (try! (nft-mint? ${name.toLowerCase().replace(/\s/g, '-')} next-id recipient))
        (var-set last-id next-id)
        (ok next-id)
    )
)
`,
    vault: (name) => `;; ${name} - Vault Contract
;; Mock implementation

(define-constant contract-owner tx-sender)
(define-map deposits principal uint)

(define-read-only (get-balance (user principal))
    (default-to u0 (map-get? deposits user))
)

(define-public (deposit (amount uint))
    (let ((current (get-balance tx-sender)))
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        (map-set deposits tx-sender (+ current amount))
        (ok true)
    )
)

(define-public (withdraw (amount uint))
    (let ((current (get-balance tx-sender)))
        (asserts! (>= current amount) (err u100))
        (try! (as-contract (stx-transfer? amount tx-sender tx-sender)))
        (map-set deposits tx-sender (- current amount))
        (ok true)
    )
)
`,
    dao: (name) => `;; ${name} - DAO Governance
;; Mock implementation

(define-constant contract-owner tx-sender)
(define-map proposals uint { title: (string-ascii 50), votes: uint, executed: bool })
(define-data-var proposal-count uint u0)

(define-public (create-proposal (title (string-ascii 50)))
    (let ((id (+ (var-get proposal-count) u1)))
        (map-set proposals id { title: title, votes: u0, executed: false })
        (var-set proposal-count id)
        (ok id)
    )
)

(define-public (vote (id uint))
    (let ((prop (unwrap! (map-get? proposals id) (err u404))))
        (map-set proposals id (merge prop { votes: (+ (get votes prop) u1) }))
        (ok true)
    )
)
`,
    default: (name) => `;; ${name} - Protocol Contract
;; Mock implementation

(define-constant contract-owner tx-sender)

(define-public (execute-action)
    (ok "Action Executed")
)

(define-read-only (get-info)
    (ok "${name} v1.0")
)
`
};

// List of 28 contracts
const deployments = [
    { file: 'arkadiko-token.clar', type: 'sip010', args: ['Arkadiko Token', 'DIKO'] },
    { file: 'arkadiko-vault.clar', type: 'vault', args: ['Arkadiko Vault'] },
    { file: 'alex-token.clar', type: 'sip010', args: ['Alex Token', 'ALEX'] },
    { file: 'alex-vault.clar', type: 'vault', args: ['Alex Vault'] },
    { file: 'velar-token.clar', type: 'sip010', args: ['Velar Token', 'VELAR'] },
    { file: 'velar-pool.clar', type: 'vault', args: ['Velar Liquidity Pool'] },
    { file: 'zest-lending.clar', type: 'vault', args: ['Zest Lending Pool'] },
    { file: 'ststx-token.clar', type: 'sip010', args: ['Stacked STX', 'stSTX'] },
    { file: 'bitflow-swap.clar', type: 'default', args: ['Bitflow Swap'] },
    { file: 'hermetica-vault.clar', type: 'vault', args: ['Hermetica Vault'] },
    { file: 'catamaran-swap.clar', type: 'default', args: ['Catamaran AMM'] },
    { file: 'magic-bridge.clar', type: 'default', args: ['Magic Bridge'] },
    { file: 'allbridge.clar', type: 'default', args: ['AllBridge'] },
    { file: 'gamma-market.clar', type: 'default', args: ['Gamma Marketplace'] },
    { file: 'megapont-nft.clar', type: 'sip009', args: ['Megapont Ape Club'] },
    { file: 'bns-system.clar', type: 'default', args: ['BNS System'] },
    { file: 'stx20-proto.clar', type: 'default', args: ['STX20 Protocol'] },
    { file: 'project-indigo.clar', type: 'sip009', args: ['Project Indigo'] },
    { file: 'crash-punks.clar', type: 'sip009', args: ['Crash Punks'] },
    { file: 'tino-gallery.clar', type: 'default', args: ['Tino Gallery'] },
    { file: 'boom-nft.clar', type: 'sip009', args: ['Boom NFT'] },
    { file: 'executor-dao.clar', type: 'dao', args: ['Executor DAO'] },
    { file: 'miamicoin.clar', type: 'sip010', args: ['MiamiCoin', 'MIA'] },
    { file: 'syvita-guild.clar', type: 'dao', args: ['Syvita Guild'] },
    { file: 'clarity-dao.clar', type: 'dao', args: ['Clarity DAO'] },
    { file: 'charisma.clar', type: 'sip010', args: ['Charisma', 'CHA'] },
    { file: 'multisafe.clar', type: 'default', args: ['MultiSafe Vault'] },
    { file: 'clarity-btc.clar', type: 'default', args: ['Clarity Bitcoin Lib'] }
];

try {
    deployments.forEach(d => {
        const generator = templates[d.type] || templates.default;
        const content = generator(...d.args);
        const filePath = path.join(targetDir, d.file);
        fs.writeFileSync(filePath, content);
        console.log(`Generated ${d.file}`);
    });
    console.log("Success: All contracts generated.");
} catch (err) {
    console.error("Error generating contracts:", err);
    process.exit(1);
}
