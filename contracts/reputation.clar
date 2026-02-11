;; =============================================
;; Conduit — Reputation System
;; =============================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-INVALID-RATING (err u302))
(define-constant ERR-SELF-RATING (err u304))
(define-constant ERR-ALREADY-RATED (err u301))

(define-constant MIN-RATING u1)
(define-constant MAX-RATING u5)

(define-data-var total-ratings uint u0)

(define-map api-reputation
  { api-id: uint }
  {
    total-score: uint,
    total-ratings: uint,
    last-rated-block: uint
  }
)

(define-map user-api-ratings
  { rater: principal, api-id: uint }
  {
    rating: uint,
    rated-at: uint,
    comment: (string-ascii 128)
  }
)

(define-public (rate-api
    (api-id uint)
    (provider principal)
    (rating uint)
    (comment (string-ascii 128))
  )
  (let
    (
      (existing-api-rep (default-to 
        { total-score: u0, total-ratings: u0, last-rated-block: u0 }
        (map-get? api-reputation { api-id: api-id })
      ))
    )
    (asserts! (and (>= rating MIN-RATING) (<= rating MAX-RATING)) ERR-INVALID-RATING)
    (asserts! (not (is-eq tx-sender provider)) ERR-SELF-RATING)
    (asserts! (is-none (map-get? user-api-ratings { rater: tx-sender, api-id: api-id })) ERR-ALREADY-RATED)

    (map-set user-api-ratings
      { rater: tx-sender, api-id: api-id }
      {
        rating: rating,
        rated-at: block-height,
        comment: comment
      }
    )

    (map-set api-reputation
      { api-id: api-id }
      {
        total-score: (+ (get total-score existing-api-rep) rating),
        total-ratings: (+ (get total-ratings existing-api-rep) u1),
        last-rated-block: block-height
      }
    )
    
    (var-set total-ratings (+ (var-get total-ratings) u1))
    (ok true)
  )
)

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
