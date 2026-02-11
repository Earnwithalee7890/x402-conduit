;; =============================================
;; Conduit — Payment Escrow Contract
;; =============================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-PAYMENT-NOT-FOUND (err u201))
(define-constant ERR-INSUFFICIENT-AMOUNT (err u202))
(define-constant ERR-ALREADY-SETTLED (err u203))
(define-constant ERR-TRANSFER-FAILED (err u206))
(define-constant ERR-ESCROW-EXPIRED (err u207))

(define-constant STATUS-PENDING u0)
(define-constant STATUS-SETTLED u1)
(define-constant STATUS-DISPUTED u2)
(define-constant STATUS-REFUNDED u3)

(define-constant ESCROW-EXPIRY-BLOCKS u144)

(define-data-var payment-counter uint u0)
(define-data-var total-volume-ustx uint u0)
(define-data-var platform-fee-bps uint u50)
(define-data-var treasury principal CONTRACT-OWNER)

(define-map payments
  { payment-id: uint }
  {
    payer: principal,
    provider: principal,
    amount-ustx: uint,
    fee-ustx: uint,
    status: uint,
    created-at: uint,
    settled-at: uint
  }
)

(define-public (create-payment
    (provider principal)
    (amount-ustx uint)
  )
  (let
    (
      (new-id (+ (var-get payment-counter) u1))
      (fee (/ (* amount-ustx (var-get platform-fee-bps)) u10000))
      (total-amount (+ amount-ustx fee))
    )
    (asserts! (> amount-ustx u0) ERR-INSUFFICIENT-AMOUNT)

    (unwrap! (stx-transfer? total-amount tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    (map-set payments
      { payment-id: new-id }
      {
        payer: tx-sender,
        provider: provider,
        amount-ustx: amount-ustx,
        fee-ustx: fee,
        status: STATUS-PENDING,
        created-at: block-height,
        settled-at: u0
      }
    )

    (var-set payment-counter new-id)
    (var-set total-volume-ustx (+ (var-get total-volume-ustx) amount-ustx))
    (ok new-id)
  )
)

(define-public (settle-payment (payment-id uint))
  (let
    (
      (payment-data (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
      (provider (get provider payment-data))
      (amount (get amount-ustx payment-data))
      (fee (get fee-ustx payment-data))
    )
    (asserts! (or (is-eq tx-sender provider) (is-eq tx-sender CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status payment-data) STATUS-PENDING) ERR-ALREADY-SETTLED)

    (unwrap! (as-contract (stx-transfer? amount tx-sender provider)) ERR-TRANSFER-FAILED)
    
    (if (> fee u0)
      (unwrap! (as-contract (stx-transfer? fee tx-sender (var-get treasury))) ERR-TRANSFER-FAILED)
      true
    )

    (map-set payments
      { payment-id: payment-id }
      (merge payment-data { status: STATUS-SETTLED, settled-at: block-height })
    )
    (ok true)
  )
)

(define-public (claim-expired-escrow (payment-id uint))
  (let
    (
      (payment-data (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
      (payer (get payer payment-data))
      (total-refund (+ (get amount-ustx payment-data) (get fee-ustx payment-data)))
    )
    (asserts! (is-eq tx-sender payer) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status payment-data) STATUS-PENDING) ERR-ALREADY-SETTLED)
    (asserts! (> block-height (+ (get created-at payment-data) ESCROW-EXPIRY-BLOCKS)) ERR-ESCROW-EXPIRED)

    (unwrap! (as-contract (stx-transfer? total-refund tx-sender payer)) ERR-TRANSFER-FAILED)

    (map-set payments
      { payment-id: payment-id }
      (merge payment-data { status: STATUS-REFUNDED, settled-at: block-height })
    )
    (ok true)
  )
)
