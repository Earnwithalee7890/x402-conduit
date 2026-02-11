;; =============================================
;; Conduit — API Registry
;; =============================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-API-EXISTS (err u101))
(define-constant ERR-API-NOT-FOUND (err u102))
(define-constant ERR-INVALID-PRICE (err u103))
(define-constant ERR-INVALID-INPUT (err u104))

(define-data-var api-counter uint u0)
(define-data-var total-providers uint u0)

(define-map api-registry
  { api-id: uint }
  {
    provider: principal,
    name: (string-ascii 64),
    description: (string-ascii 256),
    endpoint: (string-ascii 128),
    method: (string-ascii 8),
    price-ustx: uint,
    category: (string-ascii 32),
    is-active: bool,
    created-at: uint,
    updated-at: uint,
    total-calls: uint
  }
)

(define-map provider-api-count
  { provider: principal }
  { count: uint }
)

(define-map slug-to-id
  { slug: (string-ascii 64) }
  { api-id: uint }
)

(define-read-only (get-api-count)
  (ok (var-get api-counter))
)

(define-read-only (get-provider-count)
  (ok (var-get total-providers))
)

(define-read-only (get-api-by-id (api-id uint))
  (match (map-get? api-registry { api-id: api-id })
    api-data (ok api-data)
    ERR-API-NOT-FOUND
  )
)

(define-read-only (get-api-by-slug (slug (string-ascii 64)))
  (match (map-get? slug-to-id { slug: slug })
    slug-data (get-api-by-id (get api-id slug-data))
    ERR-API-NOT-FOUND
  )
)

(define-read-only (get-api-price (api-id uint))
  (match (map-get? api-registry { api-id: api-id })
    api-data (ok (get price-ustx api-data))
    ERR-API-NOT-FOUND
  )
)

(define-public (register-api
    (name (string-ascii 64))
    (description (string-ascii 256))
    (endpoint (string-ascii 128))
    (method (string-ascii 8))
    (price-ustx uint)
    (category (string-ascii 32))
  )
  (let
    (
      (new-id (+ (var-get api-counter) u1))
      (current-count (default-to u0 (get count (map-get? provider-api-count { provider: tx-sender }))))
    )
    (asserts! (> price-ustx u0) ERR-INVALID-PRICE)
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    (asserts! (is-none (map-get? slug-to-id { slug: name })) ERR-API-EXISTS)

    (map-set api-registry
      { api-id: new-id }
      {
        provider: tx-sender,
        name: name,
        description: description,
        endpoint: endpoint,
        method: method,
        price-ustx: price-ustx,
        category: category,
        is-active: true,
        created-at: block-height,
        updated-at: block-height,
        total-calls: u0
      }
    )

    (map-set slug-to-id { slug: name } { api-id: new-id })
    
    (if (is-eq current-count u0)
      (var-set total-providers (+ (var-get total-providers) u1))
      true
    )
    
    (map-set provider-api-count
      { provider: tx-sender }
      { count: (+ current-count u1) }
    )

    (var-set api-counter new-id)
    (ok new-id)
  )
)

(define-public (update-api-price (api-id uint) (new-price uint))
  (let
    (
      (api-data (unwrap! (map-get? api-registry { api-id: api-id }) ERR-API-NOT-FOUND))
    )
    (asserts! (is-eq (get provider api-data) tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (> new-price u0) ERR-INVALID-PRICE)

    (map-set api-registry
      { api-id: api-id }
      (merge api-data {
        price-ustx: new-price,
        updated-at: block-height
      })
    )
    (ok true)
  )
)

(define-public (toggle-api-status (api-id uint))
  (let
    (
      (api-data (unwrap! (map-get? api-registry { api-id: api-id }) ERR-API-NOT-FOUND))
    )
    (asserts! (is-eq (get provider api-data) tx-sender) ERR-NOT-AUTHORIZED)

    (map-set api-registry
      { api-id: api-id }
      (merge api-data {
        is-active: (not (get is-active api-data)),
        updated-at: block-height
      })
    )
    (ok (not (get is-active api-data)))
  )
)
