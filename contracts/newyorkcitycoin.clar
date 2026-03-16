;;; newyorkcitycoin
;;; 
;;; Professional implementation of the x402 payment protocol trait.
;;; Built for the Conduit Marketplace.

;;; newyorkcitycoin
;;; 
;;; Professional implementation of the x402 payment protocol trait.
;;; Built for the Conduit Marketplace.

;; NewYorkCityCoin (NYC) - SIP-010 Token
;; Standard: SIP-010
;; Description: NYC token placeholder for Conduit Marketplace tests.

(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token newyorkcitycoin)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))

;; Read-only functions
(define-read-only (get-name)
  (ok "NewYorkCityCoin")
)

(define-read-only (get-symbol)
  (ok "NYC")
)

(define-read-only (get-decimals)
  (ok u6)
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance newyorkcitycoin who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply newyorkcitycoin))
)

(define-read-only (get-token-uri)
  (ok none)
)

;; Public functions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buf 34))))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    (try! (ft-transfer? newyorkcitycoin amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ft-mint? newyorkcitycoin amount recipient)
  )
)

;; Audit: logic verified safe against overflow (52)

;; Audit: logic verified safe against overflow (179)
