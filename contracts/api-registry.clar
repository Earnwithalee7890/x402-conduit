;; =============================================
;; Conduit — API Registry Contract
;; =============================================
;; On-chain registry for pay-per-call APIs.
;; Providers register endpoints with pricing,
;; descriptions, and metadata. Agents discover
;; available APIs by reading contract state.
;; =============================================

;; ── Constants ──────────────────────────────
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-API-EXISTS (err u101))
(define-constant ERR-API-NOT-FOUND (err u102))
(define-constant ERR-INVALID-PRICE (err u103))
(define-constant ERR-INVALID-INPUT (err u104))

;; ── Data Variables ─────────────────────────
(define-data-var api-counter uint u0)
(define-data-var total-providers uint u0)

;; ── Data Maps ──────────────────────────────

;; Core API registry — maps API ID to its details
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

;; Maps provider address to their list of API IDs
(define-map provider-api-count
  { provider: principal }
  { count: uint }
)

;; Maps a slug (unique name) to an API ID for lookups
(define-map slug-to-id
  { slug: (string-ascii 64) }
  { api-id: uint }
)

;; ── Read-Only Functions ────────────────────

;; Get total registered APIs
(define-read-only (get-api-count)
  (ok (var-get api-counter))
)

;; Get total unique providers
(define-read-only (get-provider-count)
  (ok (var-get total-providers))
)

;; Get full API details by ID
(define-read-only (get-api-by-id (api-id uint))
  (match (map-get? api-registry { api-id: api-id })
    api-data (ok api-data)
    ERR-API-NOT-FOUND
  )
)

;; Get API ID by slug name
(define-read-only (get-api-by-slug (slug (string-ascii 64)))
  (match (map-get? slug-to-id { slug: slug })
    slug-data (get-api-by-id (get api-id slug-data))
    ERR-API-NOT-FOUND
  )
)

;; Get the price for an API in micro-STX
(define-read-only (get-api-price (api-id uint))
  (match (map-get? api-registry { api-id: api-id })
    api-data (ok (get price-ustx api-data))
    ERR-API-NOT-FOUND
  )
)

;; Check if an API is currently active
(define-read-only (is-api-active (api-id uint))
  (match (map-get? api-registry { api-id: api-id })
    api-data (ok (get is-active api-data))
    ERR-API-NOT-FOUND
  )
)

;; Get number of APIs registered by a provider
(define-read-only (get-provider-api-count (provider principal))
  (match (map-get? provider-api-count { provider: provider })
    data (ok (get count data))
    (ok u0)
  )
)

;; ── Public Functions ───────────────────────

;; Register a new API in the marketplace
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
      (current-count (default-to u0
        (get count (map-get? provider-api-count { provider: tx-sender }))
      ))
    )
    ;; Validate inputs
    (asserts! (> price-ustx u0) ERR-INVALID-PRICE)
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    (asserts! (> (len endpoint) u0) ERR-INVALID-INPUT)

    ;; Check slug is not already taken
    (asserts! (is-none (map-get? slug-to-id { slug: name })) ERR-API-EXISTS)

    ;; Register the API
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
        created-at: stacks-block-height,
        updated-at: stacks-block-height,
        total-calls: u0
      }
    )

    ;; Map slug to ID
    (map-set slug-to-id { slug: name } { api-id: new-id })

    ;; Update provider count
    (if (is-eq current-count u0)
      (var-set total-providers (+ (var-get total-providers) u1))
      true
    )
    (map-set provider-api-count
      { provider: tx-sender }
      { count: (+ current-count u1) }
    )

    ;; Increment counter
    (var-set api-counter new-id)

    (ok new-id)
  )
)

;; Update API pricing
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
        updated-at: stacks-block-height
      })
    )
    (ok true)
  )
)

;; Update API description
(define-public (update-api-description (api-id uint) (new-description (string-ascii 256)))
  (let
    (
      (api-data (unwrap! (map-get? api-registry { api-id: api-id }) ERR-API-NOT-FOUND))
    )
    (asserts! (is-eq (get provider api-data) tx-sender) ERR-NOT-AUTHORIZED)

    (map-set api-registry
      { api-id: api-id }
      (merge api-data {
        description: new-description,
        updated-at: stacks-block-height
      })
    )
    (ok true)
  )
)

;; Toggle API active/inactive
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
        updated-at: stacks-block-height
      })
    )
    (ok (not (get is-active api-data)))
  )
)

;; Increment total-calls counter (called by payment-escrow contract)
(define-public (record-api-call (api-id uint))
  (let
    (
      (api-data (unwrap! (map-get? api-registry { api-id: api-id }) ERR-API-NOT-FOUND))
    )
    (map-set api-registry
      { api-id: api-id }
      (merge api-data {
        total-calls: (+ (get total-calls api-data) u1)
      })
    )
    (ok true)
  )
)

;; Admin: Remove an API (only contract owner)
(define-public (admin-remove-api (api-id uint))
  (let
    (
      (api-data (unwrap! (map-get? api-registry { api-id: api-id }) ERR-API-NOT-FOUND))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)

    (map-set api-registry
      { api-id: api-id }
      (merge api-data { is-active: false })
    )
    (ok true)
  )
)
