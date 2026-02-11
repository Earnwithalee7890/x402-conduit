;; =============================================
;; Conduit — Payment Escrow Contract
;; =============================================
;; Handles STX escrow for x402 API payments.
;; Agents deposit STX which is held until the
;; API provider confirms delivery. Supports
;; dispute resolution and automatic settlement.
;; =============================================

;; ── Constants ──────────────────────────────
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-PAYMENT-NOT-FOUND (err u201))
(define-constant ERR-INSUFFICIENT-AMOUNT (err u202))
(define-constant ERR-ALREADY-SETTLED (err u203))
(define-constant ERR-ALREADY-DISPUTED (err u204))
(define-constant ERR-INVALID-STATUS (err u205))
(define-constant ERR-TRANSFER-FAILED (err u206))
(define-constant ERR-ESCROW-EXPIRED (err u207))

;; Payment status constants
(define-constant STATUS-PENDING u0)
(define-constant STATUS-SETTLED u1)
(define-constant STATUS-DISPUTED u2)
(define-constant STATUS-REFUNDED u3)

;; Escrow expires after ~144 blocks (~24 hours)
(define-constant ESCROW-EXPIRY-BLOCKS u144)

;; ── Data Variables ─────────────────────────
(define-data-var payment-counter uint u0)
(define-data-var total-volume-ustx uint u0)
(define-data-var total-settled uint u0)
(define-data-var platform-fee-bps uint u50) ;; 0.5% platform fee (50 basis points)
(define-data-var treasury principal CONTRACT-OWNER)

;; ── Data Maps ──────────────────────────────

;; Core payment escrow records
(define-map payments
  { payment-id: uint }
  {
    payer: principal,
    provider: principal,
    api-id: uint,
    amount-ustx: uint,
    fee-ustx: uint,
    status: uint,
    created-at: uint,
    settled-at: uint,
    tx-memo: (string-ascii 64)
  }
)

;; Track total earnings per provider
(define-map provider-earnings
  { provider: principal }
  {
    total-earned-ustx: uint,
    total-payments: uint,
    last-payment-block: uint
  }
)

;; Track total spending per payer (agent)
(define-map payer-spending
  { payer: principal }
  {
    total-spent-ustx: uint,
    total-calls: uint,
    last-call-block: uint
  }
)

;; ── Read-Only Functions ────────────────────

;; Get total number of payments processed
(define-read-only (get-payment-count)
  (ok (var-get payment-counter))
)

;; Get total volume in micro-STX
(define-read-only (get-total-volume)
  (ok (var-get total-volume-ustx))
)

;; Get total settled payments
(define-read-only (get-total-settled)
  (ok (var-get total-settled))
)

;; Get payment details by ID
(define-read-only (get-payment (payment-id uint))
  (match (map-get? payments { payment-id: payment-id })
    payment-data (ok payment-data)
    ERR-PAYMENT-NOT-FOUND
  )
)

;; Get provider earnings summary
(define-read-only (get-provider-earnings (provider principal))
  (ok (default-to
    { total-earned-ustx: u0, total-payments: u0, last-payment-block: u0 }
    (map-get? provider-earnings { provider: provider })
  ))
)

;; Get payer spending summary
(define-read-only (get-payer-spending (payer principal))
  (ok (default-to
    { total-spent-ustx: u0, total-calls: u0, last-call-block: u0 }
    (map-get? payer-spending { payer: payer })
  ))
)

;; Get current platform fee in basis points
(define-read-only (get-platform-fee)
  (ok (var-get platform-fee-bps))
)

;; Calculate fee for a given amount
(define-read-only (calculate-fee (amount-ustx uint))
  (ok (/ (* amount-ustx (var-get platform-fee-bps)) u10000))
)

;; ── Public Functions ───────────────────────

;; Create a payment escrow — agent pays STX into the contract
(define-public (create-payment
    (provider principal)
    (api-id uint)
    (amount-ustx uint)
    (memo (string-ascii 64))
  )
  (let
    (
      (new-id (+ (var-get payment-counter) u1))
      (fee (/ (* amount-ustx (var-get platform-fee-bps)) u10000))
      (total-amount (+ amount-ustx fee))
    )
    ;; Validate
    (asserts! (> amount-ustx u0) ERR-INSUFFICIENT-AMOUNT)

    ;; Transfer STX from payer to this contract
    (unwrap! (stx-transfer? total-amount tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    ;; Record the payment
    (map-set payments
      { payment-id: new-id }
      {
        payer: tx-sender,
        provider: provider,
        api-id: api-id,
        amount-ustx: amount-ustx,
        fee-ustx: fee,
        status: STATUS-PENDING,
        created-at: stacks-block-height,
        settled-at: u0,
        tx-memo: memo
      }
    )

    ;; Update payer spending
    (let
      (
        (current-spending (default-to
          { total-spent-ustx: u0, total-calls: u0, last-call-block: u0 }
          (map-get? payer-spending { payer: tx-sender })
        ))
      )
      (map-set payer-spending
        { payer: tx-sender }
        {
          total-spent-ustx: (+ (get total-spent-ustx current-spending) total-amount),
          total-calls: (+ (get total-calls current-spending) u1),
          last-call-block: stacks-block-height
        }
      )
    )

    ;; Update counters
    (var-set payment-counter new-id)
    (var-set total-volume-ustx (+ (var-get total-volume-ustx) amount-ustx))

    (ok new-id)
  )
)

;; Settle a payment — releases STX to the provider
(define-public (settle-payment (payment-id uint))
  (let
    (
      (payment-data (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
      (provider (get provider payment-data))
      (amount (get amount-ustx payment-data))
      (fee (get fee-ustx payment-data))
    )
    ;; Only provider or contract owner can settle
    (asserts! (or
      (is-eq tx-sender provider)
      (is-eq tx-sender CONTRACT-OWNER)
    ) ERR-NOT-AUTHORIZED)

    ;; Must be pending
    (asserts! (is-eq (get status payment-data) STATUS-PENDING) ERR-ALREADY-SETTLED)

    ;; Transfer amount to provider
    (unwrap! (as-contract (stx-transfer? amount tx-sender provider)) ERR-TRANSFER-FAILED)

    ;; Transfer fee to treasury
    (if (> fee u0)
      (unwrap! (as-contract (stx-transfer? fee tx-sender (var-get treasury))) ERR-TRANSFER-FAILED)
      true
    )

    ;; Update payment record
    (map-set payments
      { payment-id: payment-id }
      (merge payment-data {
        status: STATUS-SETTLED,
        settled-at: stacks-block-height
      })
    )

    ;; Update provider earnings
    (let
      (
        (current-earnings (default-to
          { total-earned-ustx: u0, total-payments: u0, last-payment-block: u0 }
          (map-get? provider-earnings { provider: provider })
        ))
      )
      (map-set provider-earnings
        { provider: provider }
        {
          total-earned-ustx: (+ (get total-earned-ustx current-earnings) amount),
          total-payments: (+ (get total-payments current-earnings) u1),
          last-payment-block: stacks-block-height
        }
      )
    )

    ;; Increment settled counter
    (var-set total-settled (+ (var-get total-settled) u1))

    (ok true)
  )
)

;; Dispute a payment — locks funds for admin review
(define-public (dispute-payment (payment-id uint))
  (let
    (
      (payment-data (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
    )
    ;; Only payer can dispute
    (asserts! (is-eq tx-sender (get payer payment-data)) ERR-NOT-AUTHORIZED)
    ;; Must still be pending
    (asserts! (is-eq (get status payment-data) STATUS-PENDING) ERR-ALREADY-SETTLED)

    (map-set payments
      { payment-id: payment-id }
      (merge payment-data { status: STATUS-DISPUTED })
    )
    (ok true)
  )
)

;; Refund a disputed payment — admin only
(define-public (refund-payment (payment-id uint))
  (let
    (
      (payment-data (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
      (payer (get payer payment-data))
      (total-refund (+ (get amount-ustx payment-data) (get fee-ustx payment-data)))
    )
    ;; Only contract owner can refund
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Must be disputed
    (asserts! (is-eq (get status payment-data) STATUS-DISPUTED) ERR-INVALID-STATUS)

    ;; Transfer back to payer
    (unwrap! (as-contract (stx-transfer? total-refund tx-sender payer)) ERR-TRANSFER-FAILED)

    ;; Update record
    (map-set payments
      { payment-id: payment-id }
      (merge payment-data {
        status: STATUS-REFUNDED,
        settled-at: stacks-block-height
      })
    )
    (ok true)
  )
)

;; Claim expired escrow — payer reclaims if not settled in time
(define-public (claim-expired-escrow (payment-id uint))
  (let
    (
      (payment-data (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
      (payer (get payer payment-data))
      (total-refund (+ (get amount-ustx payment-data) (get fee-ustx payment-data)))
    )
    ;; Only payer can claim
    (asserts! (is-eq tx-sender payer) ERR-NOT-AUTHORIZED)
    ;; Must be pending
    (asserts! (is-eq (get status payment-data) STATUS-PENDING) ERR-INVALID-STATUS)
    ;; Must be expired
    (asserts! (> stacks-block-height (+ (get created-at payment-data) ESCROW-EXPIRY-BLOCKS)) ERR-ESCROW-EXPIRED)

    ;; Refund to payer
    (unwrap! (as-contract (stx-transfer? total-refund tx-sender payer)) ERR-TRANSFER-FAILED)

    ;; Update record
    (map-set payments
      { payment-id: payment-id }
      (merge payment-data {
        status: STATUS-REFUNDED,
        settled-at: stacks-block-height
      })
    )
    (ok true)
  )
)

;; Admin: Update platform fee
(define-public (set-platform-fee (new-fee-bps uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Max fee: 5% (500 basis points)
    (asserts! (<= new-fee-bps u500) ERR-INSUFFICIENT-AMOUNT)
    (var-set platform-fee-bps new-fee-bps)
    (ok true)
  )
)

;; Admin: Update treasury address
(define-public (set-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set treasury new-treasury)
    (ok true)
  )
)
