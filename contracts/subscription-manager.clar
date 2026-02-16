;; =============================================
;; Conduit — Subscription Manager (Clarity 2.1)
;; =============================================
;; Credits system for API agents.
;; Fixed: Map syntax with tuples for Clarity 2+ compatibility.

(define-constant CONTRACT-OWNER tx-sender)

;; Error Codes
(define-constant ERR-NOT-AUTHORIZED (err u400))
(define-constant ERR-INVALID-AMOUNT (err u402))
(define-constant ERR-TRANSFER-FAILED (err u403))
(define-constant ERR-LOW-BALANCE (err u404))

(define-data-var base-credit-price uint u10000) ;; 1 Credit = 0.01 STX

(define-map balances
  { user: principal }
  {
    credits: uint,
    total-spent: uint,
    last-activity: uint
  }
)

;; Read-Only Functions
(define-read-only (get-user-credits (user principal))
  (default-to 
    { credits: u0, total-spent: u0, last-activity: u0 }
    (map-get? balances { user: user })
  )
)

;; Public Functions
(define-public (buy-credits (amount-ustx uint))
  (let
    (
      (new-credits (/ amount-ustx (var-get base-credit-price)))
      (current (get-user-credits tx-sender))
    )
    (asserts! (>= amount-ustx (var-get base-credit-price)) ERR-INVALID-AMOUNT)
    
    ;; Transfer to contract address
    (unwrap! (stx-transfer? amount-ustx tx-sender (as-contract tx-sender)) ERR-TRANSFER-FAILED)

    (map-set balances
      { user: tx-sender }
      {
        credits: (+ (get credits current) new-credits),
        total-spent: (get total-spent current),
        last-activity: block-height
      }
    )

    (print { event: "credits-bought", user: tx-sender, amount: new-credits })
    (ok new-credits)
  )
)

(define-public (consume-credits (user principal) (amount uint))
  (let
    (
      (current (get-user-credits user))
    )
    (asserts! (or (is-eq tx-sender user) (is-eq tx-sender CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
    (asserts! (>= (get credits current) amount) ERR-LOW-BALANCE)

    (map-set balances
      { user: user }
      {
        credits: (- (get credits current) amount),
        total-spent: (+ (get total-spent current) amount),
        last-activity: block-height
      }
    )
    (ok true)
  )
)
