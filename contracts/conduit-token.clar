;; Conduit Token (CDT) - SIP-010 Fungible Token
;; Implements the standard fungible token trait.

(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token conduit-token)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buf 34))))
    (begin
        (asserts! (is-eq tx-sender sender) err-not-token-owner)
        (try! (ft-transfer? conduit-token amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok "Conduit Token")
)

(define-read-only (get-symbol)
    (ok "CDT")
)

(define-read-only (get-decimals)
    (ok u6)
)

(define-read-only (get-balance (who principal))
    (ok (ft-get-balance conduit-token who))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply conduit-token))
)

(define-read-only (get-token-uri)
    (ok none)
)

(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ft-mint? conduit-token amount recipient)
    )
)
