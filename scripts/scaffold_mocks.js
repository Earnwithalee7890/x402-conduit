const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../contracts/external');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const commonContent = `;; Mock Contract for Sandbox Testing
;; This is a simplified version for deployment purposes only.

(define-constant ERR-NOT-AUTHORIZED (err u401))

(define-public (mock-function)
    (ok true)
)

(define-read-only (get-mock-state)
    (ok "mock-state")
)
`;

const contracts = [
    // DeFi
    "arkadiko-vault.clar",
    "arkadiko-swap.clar",
    "alex-vault.clar",
    "alex-pool.clar",
    "velar-core.clar",
    "velar-lending.clar",
    "zest-core.clar",
    "stacking-dao.clar",
    "bitflow-swap.clar",
    "hermetica-vault.clar",
    "catamaran-swap.clar",
    "magic-bridge.clar",
    "allbridge-core.clar",

    // NFT & Market
    "gamma-marketplace.clar",
    "megapont-nft.clar",
    "bns-v1.clar",
    "stx20-core.clar",
    "project-indigo.clar",
    "crash-punks.clar",
    "tino-gallery.clar",
    "boom-nft.clar",

    // DAO & Gov
    "executor-dao.clar",
    "miamicoin-core.clar",
    "syvita-guild.clar",
    "clarity-dao.clar",
    "charisma-core.clar",
    "multisafe-vault.clar",

    // Infra
    "clarity-bitcoin-lib.clar"
];

contracts.forEach(contractName => {
    const filePath = path.join(targetDir, contractName);
    const content = `;; ========================================================
;; Title: ${contractName.replace('.clar', '').toUpperCase().replace(/-/g, ' ')} (Mock)
;; Type: Sandbox Testing Contract
;; ========================================================

${commonContent}
`;
    fs.writeFileSync(filePath, content);
    console.log(`Created ${contractName}`);
});

console.log(`Successfully created ${contracts.length} mock contracts in ${targetDir}`);
