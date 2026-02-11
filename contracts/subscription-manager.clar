;; =============================================
;; Conduit — Subscription Manager Contract
;; =============================================
;; Prepaid credit system for the API marketplace.
;; Agents deposit STX to get credits, then spend
;; credits on API calls without per-call payments.
;; Supports credit bundles and volume discounts.
;; =============================================

;; ── Constants ──────────────────────────────
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u400))
(define-constant ERR-INSUFFICIENT-CREDITS (err u401))
(define-constant ERR-INSUFFICIENT-AMOUNT (err u402))
(define-constant ERR-TRANSFER-FAILED (err u403))
(define-constant ERR-PLAN-NOT-FOUND (err u404))
(define-constant ERR-ALREADY-SUBSCRIBED (err u405))
(define-constant ERR-SUBSCRIPTION-EXPIRED (err u406))
(define-constant ERR-INVALID-INPUT (err u407))

;; Credit tiers — how many credits per STX
;; Higher deposits = better rate (volume discount)
(define-constant CREDITS-PER-STX-BASE u100)       ;; Base rate: 100 credits per STX
(define-constant CREDITS-PER-STX-SILVER u120)      ;; 10+ STX: 20% bonus
(define-constant CREDITS-PER-STX-GOLD u150)        ;; 50+ STX: 50% bonus
(define-constant CREDITS-PER-STX-PLATINUM u200)    ;; 100+ STX: 100% bonus

;; Subscription durations in blocks (~10 min per block)
(define-constant DURATION-MONTHLY u4320)    ;; ~30 days
(define-constant DURATION-QUARTERLY u12960) ;; ~90 days
(define-constant DURATION-ANNUAL u52560)    ;; ~365 days

;; ── Data Variables ─────────────────────────
(define-data-var total-credits-issued uint u0)
(define-data-var total-credits-spent uint u0)
(define-data-var total-subscribers uint u0)
(define-data-var plan-counter uint u0)

;; ── Data Maps ──────────────────────────────

;; User credit balances
(define-map credit-balances
  { user: principal }
  {
    credits: uint,
    total-purchased: uint,
    total-spent: uint,
    tier: uint,
    first-purchase-block: uint,
    last-purchase-block: uint
  }
)

;; Subscription plans defined by admin
(define-map subscription-plans
  { plan-id: uint }
  {
    name: (string-ascii 64),
    price-ustx: uint,
    credits-included: uint,
    duration-blocks: uint,
    is-active: bool
  }
)

;; Active user subscriptions
(define-map user-subscriptions
  { user: principal }
  {
    plan-id: uint,
    credits-remaining: uint,
    started-at: uint,
    expires-at: uint,
    auto-renew: bool
  }
)

;; API credit costs
(define-map api-credit-costs
  { api-id: uint }
  { credits-per-call: uint }
)

;; ── Read-Only Functions ────────────────────

;; Get user's credit balance
(define-read-only (get-credits (user principal))
  (ok (default-to
    {
      credits: u0,
      total-purchased: u0,
      total-spent: u0,
      tier: u0,
      first-purchase-block: u0,
      last-purchase-block: u0
    }
    (map-get? credit-balances { user: user })
  ))
)

;; Get a user's available credit count
(define-read-only (get-credit-count (user principal))
  (ok (default-to u0
    (get credits (map-get? credit-balances { user: user }))
  ))
)

;; Get subscription plan details
(define-read-only (get-plan (plan-id uint))
  (match (map-get? subscription-plans { plan-id: plan-id })
    plan-data (ok plan-data)
    ERR-PLAN-NOT-FOUND
  )
)

;; Get user's active subscription
(define-read-only (get-subscription (user principal))
  (match (map-get? user-subscriptions { user: user })
    sub-data (ok sub-data)
    ERR-PLAN-NOT-FOUND
  )
)

;; Check if subscription is still valid
(define-read-only (is-subscription-active (user principal))
  (match (map-get? user-subscriptions { user: user })
    sub-data (ok (< stacks-block-height (get expires-at sub-data)))
    (ok false)
  )
)

;; Get total marketplace stats
(define-read-only (get-marketplace-stats)
  (ok {
    total-credits-issued: (var-get total-credits-issued),
    total-credits-spent: (var-get total-credits-spent),
    total-subscribers: (var-get total-subscribers),
    total-plans: (var-get plan-counter)
  })
)

;; Calculate credits for a given STX deposit (with volume discount)
(define-read-only (calculate-credits (amount-ustx uint))
  (let
    (
      (amount-stx (/ amount-ustx u1000000))
      (rate (if (>= amount-stx u100) CREDITS-PER-STX-PLATINUM
              (if (>= amount-stx u50) CREDITS-PER-STX-GOLD
                (if (>= amount-stx u10) CREDITS-PER-STX-SILVER
                  CREDITS-PER-STX-BASE
                )
              )
            ))
    )
    (ok (* amount-stx rate))
  )
)

;; Get credit cost for an API call
(define-read-only (get-api-credit-cost (api-id uint))
  (ok (default-to u1
    (get credits-per-call (map-get? api-credit-costs { api-id: api-id }))
  ))
)

;; ── Public Functions ───────────────────────

;; Purchase credits with STX (volume discounts apply)
(define-public (purchase-credits (amount-ustx uint))
  (let
    (
      (amount-stx (/ amount-ustx u1000000))
      (rate (if (>= amount-stx u100) CREDITS-PER-STX-PLATINUM
              (if (>= amount-stx u50) CREDITS-PER-STX-GOLD
                (if (>= amount-stx u10) CREDITS-PER-STX-SILVER
                  CREDITS-PER-STX-BASE
                )
              )
            ))
      (new-credits (* amount-stx rate))
      (existing (default-to
        {
          credits: u0,
          total-purchased: u0,
          total-spent: u0,
          tier: u0,
          first-purchase-block: u0,
          last-purchase-block: u0
        }
        (map-get? credit-balances { user: tx-sender })
      ))
      (is-new-user (is-eq (get total-purchased existing) u0))
    )
    ;; Validate
    (asserts! (> amount-ustx u0) ERR-INSUFFICIENT-AMOUNT)
    (asserts! (> new-credits u0) ERR-INSUFFICIENT-AMOUNT)

    ;; Transfer STX from buyer to contract
    (unwrap! (stx-transfer? amount-ustx tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    ;; Calculate tier based on total purchased
    (let
      (
        (total-after (+ (get total-purchased existing) new-credits))
        (new-tier (if (>= total-after u20000) u4
                    (if (>= total-after u7500) u3
                      (if (>= total-after u1200) u2
                        (if (>= total-after u100) u1
                          u0
                        )
                      )
                    )
                  ))
      )
      ;; Update balance
      (map-set credit-balances
        { user: tx-sender }
        {
          credits: (+ (get credits existing) new-credits),
          total-purchased: total-after,
          total-spent: (get total-spent existing),
          tier: new-tier,
          first-purchase-block: (if is-new-user stacks-block-height (get first-purchase-block existing)),
          last-purchase-block: stacks-block-height
        }
      )
    )

    ;; Update globals
    (var-set total-credits-issued (+ (var-get total-credits-issued) new-credits))
    (if is-new-user
      (var-set total-subscribers (+ (var-get total-subscribers) u1))
      true
    )

    (ok new-credits)
  )
)

;; Spend credits on an API call
(define-public (spend-credits (api-id uint) (credits-to-spend uint))
  (let
    (
      (existing (unwrap!
        (map-get? credit-balances { user: tx-sender })
        ERR-INSUFFICIENT-CREDITS
      ))
    )
    ;; Validate balance
    (asserts! (>= (get credits existing) credits-to-spend) ERR-INSUFFICIENT-CREDITS)
    (asserts! (> credits-to-spend u0) ERR-INVALID-INPUT)

    ;; Deduct credits
    (map-set credit-balances
      { user: tx-sender }
      (merge existing {
        credits: (- (get credits existing) credits-to-spend),
        total-spent: (+ (get total-spent existing) credits-to-spend)
      })
    )

    ;; Update global spent counter
    (var-set total-credits-spent (+ (var-get total-credits-spent) credits-to-spend))

    (ok true)
  )
)

;; Subscribe to a plan
(define-public (subscribe (plan-id uint))
  (let
    (
      (plan-data (unwrap! (map-get? subscription-plans { plan-id: plan-id }) ERR-PLAN-NOT-FOUND))
    )
    ;; Plan must be active
    (asserts! (get is-active plan-data) ERR-PLAN-NOT-FOUND)

    ;; Transfer payment
    (unwrap! (stx-transfer? (get price-ustx plan-data) tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    ;; Set subscription
    (map-set user-subscriptions
      { user: tx-sender }
      {
        plan-id: plan-id,
        credits-remaining: (get credits-included plan-data),
        started-at: stacks-block-height,
        expires-at: (+ stacks-block-height (get duration-blocks plan-data)),
        auto-renew: false
      }
    )

    ;; Add credits to balance
    (let
      (
        (existing (default-to
          {
            credits: u0,
            total-purchased: u0,
            total-spent: u0,
            tier: u0,
            first-purchase-block: u0,
            last-purchase-block: u0
          }
          (map-get? credit-balances { user: tx-sender })
        ))
      )
      (map-set credit-balances
        { user: tx-sender }
        (merge existing {
          credits: (+ (get credits existing) (get credits-included plan-data)),
          total-purchased: (+ (get total-purchased existing) (get credits-included plan-data)),
          last-purchase-block: stacks-block-height
        })
      )
    )

    (ok true)
  )
)

;; Toggle auto-renew for subscription
(define-public (toggle-auto-renew)
  (let
    (
      (sub-data (unwrap! (map-get? user-subscriptions { user: tx-sender }) ERR-PLAN-NOT-FOUND))
    )
    (map-set user-subscriptions
      { user: tx-sender }
      (merge sub-data { auto-renew: (not (get auto-renew sub-data)) })
    )
    (ok (not (get auto-renew sub-data)))
  )
)

;; ── Admin Functions ────────────────────────

;; Create a subscription plan
(define-public (create-plan
    (name (string-ascii 64))
    (price-ustx uint)
    (credits-included uint)
    (duration-blocks uint)
  )
  (let
    (
      (new-id (+ (var-get plan-counter) u1))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> price-ustx u0) ERR-INVALID-INPUT)
    (asserts! (> credits-included u0) ERR-INVALID-INPUT)

    (map-set subscription-plans
      { plan-id: new-id }
      {
        name: name,
        price-ustx: price-ustx,
        credits-included: credits-included,
        duration-blocks: duration-blocks,
        is-active: true
      }
    )

    (var-set plan-counter new-id)
    (ok new-id)
  )
)

;; Set credit cost for an API
(define-public (set-api-credit-cost (api-id uint) (credits-per-call uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> credits-per-call u0) ERR-INVALID-INPUT)
    (map-set api-credit-costs
      { api-id: api-id }
      { credits-per-call: credits-per-call }
    )
    (ok true)
  )
)

;; Deactivate a plan
(define-public (deactivate-plan (plan-id uint))
  (let
    (
      (plan-data (unwrap! (map-get? subscription-plans { plan-id: plan-id }) ERR-PLAN-NOT-FOUND))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (map-set subscription-plans
      { plan-id: plan-id }
      (merge plan-data { is-active: false })
    )
    (ok true)
  )
)

;; Withdraw accumulated STX from contract
(define-public (withdraw (amount-ustx uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> amount-ustx u0) ERR-INSUFFICIENT-AMOUNT)
    (unwrap! (as-contract (stx-transfer? amount-ustx tx-sender recipient)) ERR-TRANSFER-FAILED)
    (ok true)
  )
)
