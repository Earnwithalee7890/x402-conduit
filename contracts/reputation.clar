;; =============================================
;; Conduit — Reputation (Clarity 2.1 / Nakamoto)
;; =============================================
;; Distributed trust scoring for API providers.
;; Fixed: Tuple-based maps for Clarity 2+ compatibility.

(define-constant CONTRACT-OWNER tx-sender)

;; Error Codes
(define-constant ERR-ALREADY-RATED (err u301))
(define-constant ERR-INVALID-RATING (err u302))

(define-map reputation 
  { provider: principal }
  { score: uint, count: uint }
)

(define-map ratings 
  { rater: principal, provider: principal } 
  { rating: uint, comment: (string-ascii 120) }
)

;; Read-Only Functions
(define-read-only (get-reputation (provider principal))
  (default-to { score: u0, count: u0 } (map-get? reputation { provider: provider }))
)

(define-read-only (get-rating-count (provider principal))
  (get count (get-reputation provider))
)

;; Public Functions
(define-public (rate-provider (provider principal) (rating uint) (comment (string-ascii 120)))
  (let
    (
      (current-rep (get-reputation provider))
    )
    (asserts! (and (>= rating u1) (<= rating u5)) ERR-INVALID-RATING)
    (asserts! (is-none (map-get? ratings { rater: tx-sender, provider: provider })) ERR-ALREADY-RATED)
    
    (map-set ratings
      { rater: tx-sender, provider: provider }
      { rating: rating, comment: comment }
    )
    
    (map-set reputation
      { provider: provider }
      {
        score: (+ (get score current-rep) rating),
        count: (+ (get count current-rep) u1)
      }
    )
    (print { event: "provider-rated", provider: provider, score: rating })
    (ok true)
  )
)
