;; Conduit - Fee-Free Signal
;; Simpler version using stacks-block-height for Nakamoto compatibility

(define-map user-activity 
  { user: principal } 
  { 
    signal-count: uint, 
    last-signal: uint 
  }
)

(define-data-var total-signals uint u0)

;; Read-only functions
(define-read-only (get-signal-info (user principal))
  (default-to 
    { signal-count: u0, last-signal: u0 }
    (map-get? user-activity { user: user })
  )
)

;; Public function
(define-public (signal-participation)
  (let 
    (
      (caller tx-sender)
      (current (get-signal-info caller))
    )
    (map-set user-activity 
      { user: caller } 
      { 
        signal-count: (+ (get signal-count current) u1), 
        last-signal: stacks-block-height 
      }
    )
    (var-set total-signals (+ (var-get total-signals) u1))
    (print { event: "signal", user: caller, height: stacks-block-height })
    (ok true)
  )
)
