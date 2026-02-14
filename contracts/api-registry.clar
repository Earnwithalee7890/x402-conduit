;; =============================================
;; Conduit — API Registry (Clarity 2.1 / Nakamoto)
;; =============================================
;; Professional-grade API registry for the Conduit Marketplace.
;; Fixed: Map syntax using Tuples and Nakamoto-ready logic.

(define-constant CONTRACT-OWNER tx-sender)

;; Error Codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-API-EXISTS (err u101))
(define-constant ERR-API-NOT-FOUND (err u102))
(define-constant ERR-INVALID-PRICE (err u103))
(define-constant ERR-INVALID-INPUT (err u104))

;; Data Storage
(define-data-var api-counter uint u0)

(define-map api-registry
  { api-id: uint }
  {
    provider: principal,
    name: (string-ascii 64),
    description: (string-ascii 256),
    endpoint: (string-ascii 128),
    price: uint,
    category: (string-ascii 32),
    active: bool,
    calls: uint,
    revenue: uint
  }
)

(define-map slug-index 
  { slug: (string-ascii 64) } 
  { api-id: uint }
)

;; Read-Only Functions
(define-read-only (get-api-data (api-id uint))
  (map-get? api-registry { api-id: api-id })
)

(define-read-only (get-total-apis)
  (var-get api-counter)
)

(define-read-only (get-api-by-slug (slug (string-ascii 64)))
  (match (map-get? slug-index { slug: slug })
    slug-data (get-api-data (get api-id slug-data))
    none
  )
)

;; Public Functions
(define-public (register-api 
    (name (string-ascii 64)) 
    (description (string-ascii 256)) 
    (endpoint (string-ascii 128)) 
    (price uint) 
    (category (string-ascii 32))
  )
  (let
    (
      (new-id (+ (var-get api-counter) u1))
    )
    (asserts! (is-none (map-get? slug-index { slug: name })) ERR-API-EXISTS)
    (asserts! (> price u0) ERR-INVALID-PRICE)
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)

    (map-set api-registry
      { api-id: new-id }
      {
        provider: tx-sender,
        name: name,
        description: description,
        endpoint: endpoint,
        price: price,
        category: category,
        active: true,
        calls: u0,
        revenue: u0
      }
    )

    (map-set slug-index { slug: name } { api-id: new-id })
    (var-set api-counter new-id)
    (print { event: "api-registered", id: new-id, provider: tx-sender })
    (ok new-id)
  )
)

(define-public (update-api-status (api-id uint) (is-active bool))
  (let
    (
      (api (unwrap! (map-get? api-registry { api-id: api-id }) ERR-API-NOT-FOUND))
    )
    (asserts! (is-eq (get provider api) tx-sender) ERR-NOT-AUTHORIZED)
    (map-set api-registry
      { api-id: api-id }
      (merge api { active: is-active })
    )
    (ok true)
  )
)

;; Internal usage tracking
(define-public (track-usage (api-id uint) (earned uint))
  (let
    (
      (api (unwrap! (map-get? api-registry { api-id: api-id }) ERR-API-NOT-FOUND))
    )
    (map-set api-registry
      { api-id: api-id }
      (merge api { 
        calls: (+ (get calls api) u1),
        revenue: (+ (get revenue api) earned)
      })
    )
    (ok true)
  )
)
