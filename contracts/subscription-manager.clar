;; =============================================
;; Conduit — Subscription Manager
;; =============================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u400))
(define-constant ERR-INSUFFICIENT-CREDITS (err u401))
(define-constant ERR-INSUFFICIENT-AMOUNT (err u402))
(define-constant ERR-TRANSFER-FAILED (err u403))

(define-data-var total-credits-issued uint u0)

(define-map credit-balances
  { user: principal }
  {
    credits: uint,
    total-purchased: uint,
    last-purchase-block: uint
  }
)

(define-read-only (get-credits (user principal))
  (ok (default-to
    { credits: u0, total-purchased: u0, last-purchase-block: u0 }
    (map-get? credit-balances { user: user })
  ))
)

(define-public (purchase-credits (amount-ustx uint))
  (let
    (
      (amount-stx (/ amount-ustx u1000000))
      (new-credits (* amount-stx u100))
      (existing (default-to
        { credits: u0, total-purchased: u0, last-purchase-block: u0 }
        (map-get? credit-balances { user: tx-sender })
      ))
    )
    (asserts! (> amount-ustx u0) ERR-INSUFFICIENT-AMOUNT)

    (unwrap! (stx-transfer? amount-ustx tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    (map-set credit-balances
      { user: tx-sender }
      {
        credits: (+ (get credits existing) new-credits),
        total-purchased: (+ (get total-purchased existing) new-credits),
        last-purchase-block: block-height
      }
    )

    (var-set total-credits-issued (+ (var-get total-credits-issued) new-credits))
    (ok new-credits)
  )
)

(define-public (spend-credits (credits-to-spend uint))
  (let
    (
      (existing (unwrap!
        (map-get? credit-balances { user: tx-sender })
        ERR-INSUFFICIENT-CREDITS
      ))
    )
    (asserts! (>= (get credits existing) credits-to-spend) ERR-INSUFFICIENT-CREDITS)

    (map-set credit-balances
      { user: tx-sender }
      {
        credits: (- (get credits existing) credits-to-spend),
        total-purchased: (get total-purchased existing),
        last-purchase-block: (get last-purchase-block existing)
      }
    )
    (ok true)
  )
)
