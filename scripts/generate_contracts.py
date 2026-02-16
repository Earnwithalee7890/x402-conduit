import os

target_dir = r"f:\Dorahacks\x402-agent-marketplace\contracts"
os.makedirs(target_dir, exist_ok=True)

templates = {
    "sip010": """;; {name} ({symbol}) - SIP-010 Token
(impl-trait .sip-010-trait-ft-standard.sip-010-trait)
(define-fungible-token {slug})
(define-constant contract-owner tx-sender)
(define-read-only (get-name) (ok "{name}"))
(define-read-only (get-symbol) (ok "{symbol}"))
(define-read-only (get-decimals) (ok u6))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance {slug} who)))
(define-read-only (get-total-supply) (ok (ft-get-supply {slug})))
(define-read-only (get-token-uri) (ok none))
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buf 34))))
    (begin
        (asserts! (is-eq tx-sender sender) (err u100))
        (try! (ft-transfer? {slug} amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)
(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) (err u101))
        (ft-mint? {slug} amount recipient)
    )
)
""",
    "sip009": """;; {name} - SIP-009 NFT
(impl-trait .sip-009-trait-nft-standard.sip-009-trait)
(define-non-fungible-token {slug} uint)
(define-data-var last-id uint u0)
(define-constant contract-owner tx-sender)
(define-read-only (get-last-token-id) (ok (var-get last-id)))
(define-read-only (get-token-uri (id uint)) (ok none))
(define-read-only (get-owner (id uint)) (ok (nft-get-owner? {slug} id)))
(define-public (transfer (id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) (err u100))
        (nft-transfer? {slug} id sender recipient)
    )
)
(define-public (mint (recipient principal))
    (let ((next-id (+ (var-get last-id) u1)))
        (asserts! (is-eq tx-sender contract-owner) (err u101))
        (try! (nft-mint? {slug} next-id recipient))
        (var-set last-id next-id)
        (ok next-id)
    )
)
""",
    "vault": """;; {name} - Vault
(define-constant contract-owner tx-sender)
(define-map deposits principal uint)
(define-read-only (get-balance (user principal)) (default-to u0 (map-get? deposits user)))
(define-public (deposit (amount uint))
    (let ((current (get-balance tx-sender)))
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        (map-set deposits tx-sender (+ current amount))
        (ok true)
    )
)
(define-public (execute (target principal))
    (ok "Action Executed")
)
"""
}

contracts = [
    ("arkadiko-token.clar", "sip010", {"name": "Arkadiko Token", "symbol": "DIKO", "slug": "diko"}),
    ("alex-token.clar", "sip010", {"name": "Alex Token", "symbol": "ALEX", "slug": "alex"}),
    ("velar-token.clar", "sip010", {"name": "Velar Token", "symbol": "VELAR", "slug": "velar"}),
    ("ststx-token.clar", "sip010", {"name": "Stacked STX", "symbol": "stSTX", "slug": "ststx"}),
    ("miamicoin.clar", "sip010", {"name": "MiamiCoin", "symbol": "MIA", "slug": "miamicoin"}),
    ("newyorkcitycoin.clar", "sip010", {"name": "NYCCoin", "symbol": "NYC", "slug": "nyccoin"}),
    ("charisma-token.clar", "sip010", {"name": "Charisma", "symbol": "CHA", "slug": "charisma"}),
    ("usda-token.clar", "sip010", {"name": "USDA Stablecoin", "symbol": "USDA", "slug": "usda"}),
    ("xbtc-token.clar", "sip010", {"name": "Wrapped Bitcoin", "symbol": "xBTC", "slug": "xbtc"}),
    
    ("megapont-nft.clar", "sip009", {"name": "Megapont Ape Club", "slug": "megapont-ape-club"}),
    ("project-indigo.clar", "sip009", {"name": "Project Indigo", "slug": "project-indigo"}),
    ("crash-punks.clar", "sip009", {"name": "Crash Punks", "slug": "crash-punks"}),
    ("boom-nft.clar", "sip009", {"name": "Boom NFT", "slug": "boom-nft"}),
    ("gamma-collections.clar", "sip009", {"name": "Gamma Collection", "slug": "gamma-collection"}),
    ("bitcoin-monkeys.clar", "sip009", {"name": "Bitcoin Monkeys", "slug": "bitcoin-monkeys"}),
    ("satoshis-nft.clar", "sip009", {"name": "Satoshis", "slug": "satoshis"}),

    ("arkadiko-vault.clar", "vault", {"name": "Arkadiko Vault"}),
    ("alex-vault.clar", "vault", {"name": "Alex Vault"}),
    ("velar-pool.clar", "vault", {"name": "Velar Pool"}),
    ("zest-lending.clar", "vault", {"name": "Zest Lending"}),
    ("stacking-dao.clar", "vault", {"name": "Stacking DAO"}),
    ("bitflow-pool.clar", "vault", {"name": "Bitflow Pool"}),
    ("hermetica.clar", "vault", {"name": "Hermetica Vault"}),
    ("magic-bridge.clar", "vault", {"name": "Magic Bridge"}),
    ("executor-dao.clar", "vault", {"name": "Executor DAO"}),
    ("clarity-dao.clar", "vault", {"name": "Clarity DAO"}),
    ("multisafe.clar", "vault", {"name": "MultiSafe"}),
]

for filename, type_key, context in contracts:
    content = templates[type_key].format(**context)
    path = os.path.join(target_dir, filename)
    with open(path, "w") as f:
        f.write(content)
    print(f"Generated {filename}")

print(f"Successfully generated {len(contracts)} contracts.")
