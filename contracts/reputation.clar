;; =============================================
;; Conduit — Reputation System Contract
;; =============================================
;; On-chain reputation scoring for API providers.
;; Agents rate APIs after each paid call, building
;; a trust layer for the marketplace. Ratings
;; are weighted by recency and volume.
;; =============================================

;; ── Constants ──────────────────────────────
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u300))
(define-constant ERR-ALREADY-RATED (err u301))
(define-constant ERR-INVALID-RATING (err u302))
(define-constant ERR-API-NOT-FOUND (err u303))
(define-constant ERR-SELF-RATING (err u304))
(define-constant ERR-NO-RATINGS (err u305))

;; Rating scale: 1-5 (stored as u1-u5)
(define-constant MIN-RATING u1)
(define-constant MAX-RATING u5)

;; Reputation tiers
(define-constant TIER-NEW u0)        ;; 0 ratings
(define-constant TIER-BRONZE u1)     ;; 1-9 ratings
(define-constant TIER-SILVER u2)     ;; 10-49 ratings
(define-constant TIER-GOLD u3)       ;; 50-199 ratings
(define-constant TIER-PLATINUM u4)   ;; 200+ ratings

;; ── Data Variables ─────────────────────────
(define-data-var total-ratings uint u0)
(define-data-var total-rated-apis uint u0)

;; ── Data Maps ──────────────────────────────

;; Aggregated reputation per API
(define-map api-reputation
  { api-id: uint }
  {
    total-score: uint,
    total-ratings: uint,
    last-rated-block: uint,
    one-star: uint,
    two-star: uint,
    three-star: uint,
    four-star: uint,
    five-star: uint
  }
)

;; Aggregated reputation per provider
(define-map provider-reputation
  { provider: principal }
  {
    total-score: uint,
    total-ratings: uint,
    total-apis-rated: uint,
    tier: uint
  }
)

;; Prevent duplicate ratings per user per API
(define-map user-api-ratings
  { rater: principal, api-id: uint }
  {
    rating: uint,
    rated-at: uint,
    comment: (string-ascii 128)
  }
)

;; ── Read-Only Functions ────────────────────

;; Get global rating stats
(define-read-only (get-total-ratings)
  (ok (var-get total-ratings))
)

;; Get API reputation details
(define-read-only (get-api-reputation (api-id uint))
  (match (map-get? api-reputation { api-id: api-id })
    rep-data (ok rep-data)
    ERR-API-NOT-FOUND
  )
)

;; Get average rating for an API (returns x100 for precision, e.g. 425 = 4.25)
(define-read-only (get-api-average-rating (api-id uint))
  (match (map-get? api-reputation { api-id: api-id })
    rep-data
      (if (> (get total-ratings rep-data) u0)
        (ok (/ (* (get total-score rep-data) u100) (get total-ratings rep-data)))
        (ok u0)
      )
    (ok u0)
  )
)

;; Get provider reputation
(define-read-only (get-provider-reputation (provider principal))
  (ok (default-to
    { total-score: u0, total-ratings: u0, total-apis-rated: u0, tier: TIER-NEW }
    (map-get? provider-reputation { provider: provider })
  ))
)

;; Get a specific user's rating for an API
(define-read-only (get-user-rating (rater principal) (api-id uint))
  (match (map-get? user-api-ratings { rater: rater, api-id: api-id })
    rating-data (ok rating-data)
    ERR-NO-RATINGS
  )
)

;; Check if user has already rated an API
(define-read-only (has-rated (rater principal) (api-id uint))
  (ok (is-some (map-get? user-api-ratings { rater: rater, api-id: api-id })))
)

;; Calculate reputation tier based on total ratings
(define-read-only (calculate-tier (total uint))
  (if (>= total u200) TIER-PLATINUM
    (if (>= total u50) TIER-GOLD
      (if (>= total u10) TIER-SILVER
        (if (>= total u1) TIER-BRONZE
          TIER-NEW
        )
      )
    )
  )
)

;; ── Public Functions ───────────────────────

;; Rate an API (1-5 stars)
(define-public (rate-api
    (api-id uint)
    (provider principal)
    (rating uint)
    (comment (string-ascii 128))
  )
  (let
    (
      (existing-api-rep (default-to
        {
          total-score: u0,
          total-ratings: u0,
          last-rated-block: u0,
          one-star: u0,
          two-star: u0,
          three-star: u0,
          four-star: u0,
          five-star: u0
        }
        (map-get? api-reputation { api-id: api-id })
      ))
      (existing-provider-rep (default-to
        { total-score: u0, total-ratings: u0, total-apis-rated: u0, tier: TIER-NEW }
        (map-get? provider-reputation { provider: provider })
      ))
      (is-first-api-rating (is-eq (get total-ratings existing-api-rep) u0))
    )
    ;; Validate rating range
    (asserts! (and (>= rating MIN-RATING) (<= rating MAX-RATING)) ERR-INVALID-RATING)
    ;; Cannot rate yourself
    (asserts! (not (is-eq tx-sender provider)) ERR-SELF-RATING)
    ;; Cannot rate same API twice
    (asserts! (is-none (map-get? user-api-ratings { rater: tx-sender, api-id: api-id })) ERR-ALREADY-RATED)

    ;; Store individual rating
    (map-set user-api-ratings
      { rater: tx-sender, api-id: api-id }
      {
        rating: rating,
        rated-at: stacks-block-height,
        comment: comment
      }
    )

    ;; Update API reputation with star distribution
    (map-set api-reputation
      { api-id: api-id }
      {
        total-score: (+ (get total-score existing-api-rep) rating),
        total-ratings: (+ (get total-ratings existing-api-rep) u1),
        last-rated-block: stacks-block-height,
        one-star: (if (is-eq rating u1) (+ (get one-star existing-api-rep) u1) (get one-star existing-api-rep)),
        two-star: (if (is-eq rating u2) (+ (get two-star existing-api-rep) u1) (get two-star existing-api-rep)),
        three-star: (if (is-eq rating u3) (+ (get three-star existing-api-rep) u1) (get three-star existing-api-rep)),
        four-star: (if (is-eq rating u4) (+ (get four-star existing-api-rep) u1) (get four-star existing-api-rep)),
        five-star: (if (is-eq rating u5) (+ (get five-star existing-api-rep) u1) (get five-star existing-api-rep))
      }
    )

    ;; Update provider reputation
    (let
      (
        (new-total-ratings (+ (get total-ratings existing-provider-rep) u1))
        (new-apis-rated (if is-first-api-rating
          (+ (get total-apis-rated existing-provider-rep) u1)
          (get total-apis-rated existing-provider-rep)
        ))
      )
      (map-set provider-reputation
        { provider: provider }
        {
          total-score: (+ (get total-score existing-provider-rep) rating),
          total-ratings: new-total-ratings,
          total-apis-rated: new-apis-rated,
          tier: (calculate-tier new-total-ratings)
        }
      )
    )

    ;; Update globals
    (var-set total-ratings (+ (var-get total-ratings) u1))
    (if is-first-api-rating
      (var-set total-rated-apis (+ (var-get total-rated-apis) u1))
      true
    )

    (ok true)
  )
)
