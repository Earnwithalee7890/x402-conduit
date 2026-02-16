;; =============================================
;; Conduit — Payment & Escrow (Clarity 2.1 / Nakamoto)
;; =============================================
;; Secure escrow and settlement logic for API calls.
;; Fixed: Map syntax with tuples and as-contract transfer logic.

(define-constant CONTRACT-OWNER tx-sender)

;; Error Codes
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-PAYMENT-NOT-FOUND (err u201))
(define-constant ERR-INSUFFICIENT-FUNDS (err u202))
(define-constant ERR-ALREADY-SETTLED (err u203))
(define-constant ERR-TRANSFER-FAILED (err u204))

;; State
(define-data-var payment-nonce uint u0)

(define-map payment-ledger
  { payment-id: uint }
  {
    payer: principal,
    provider: principal,
    amount: uint,
    status: (string-ascii 16),
    timestamp: uint
  }
)

;; Public Functions

;; Create payment and lock in escrow
(define-public (escrow-payment (provider principal) (amount uint))
  (let
    (
      (id (+ (var-get payment-nonce) u1))
    )
    (asserts! (> amount u0) ERR-INSUFFICIENT-FUNDS)
    
    ;; Transfer from user to contract address
    (unwrap! (stx-transfer? amount tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)
    
    (map-set payment-ledger
      { payment-id: id }
      {
        payer: tx-sender,
        provider: provider,
        amount: amount,
        status: "pending",
        timestamp: block-height
      }
    )
    
    (var-set payment-nonce id)
    (print { event: "payment-locked", id: id, provider: provider })
    (ok id)
  )
)

;; Release locked payment to provider
(define-public (settle-payment (payment-id uint))
  (let
    (
      (p (unwrap! (map-get? payment-ledger { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
      (provider (get provider p))
      (amount (get amount p))
    )
    (asserts! (is-eq (get status p) "pending") ERR-ALREADY-SETTLED)
    ;; Only provider or owner can settle
    (asserts! (or (is-eq tx-sender provider) (is-eq tx-sender CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
    
    ;; Transfer from contract to provider
    (unwrap! (as-contract (stx-transfer? amount tx-sender provider)) ERR-TRANSFER-FAILED)
    
    (map-set payment-ledger
      { payment-id: payment-id }
      (merge p { status: "settled" })
    )
    (print { event: "payment-settled", id: payment-id })
    (ok true)
  )
)

;; Refund payment to user
(define-public (refund-payment (payment-id uint))
  (let
    (
      (p (unwrap! (map-get? payment-ledger { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
      (payer (get payer p))
      (amount (get amount p))
    )
    (asserts! (is-eq (get status p) "pending") ERR-ALREADY-SETTLED)
    (asserts! (or (is-eq tx-sender payer) (is-eq tx-sender CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
    
    (unwrap! (as-contract (stx-transfer? amount tx-sender payer)) ERR-TRANSFER-FAILED)
    
    (map-set payment-ledger
      { payment-id: payment-id }
      (merge p { status: "refunded" })
    )
    (print { event: "payment-refunded", id: payment-id })
    (ok true)
  )
)
