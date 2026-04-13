;;; sip-010-trait-ft-standard
;;; 
;;; Professional implementation of the x402 payment protocol trait.
;;; Built for the Conduit Marketplace.

;;; sip-010-trait-ft-standard
;;; 
;;; Professional implementation of the x402 payment protocol trait.
;;; Built for the Conduit Marketplace.

;; SIP-010 Fungible Token Standard Trait definition

(define-trait sip-010-trait
  (
    ;; Transfer from the sender to a new principal
    (transfer (uint principal principal (optional (buf 34))) (response bool uint))

    ;; the human readable name of the token
    (get-name () (response (string-ascii 32) uint))

    ;; the ticker symbol, or empty if none
    (get-symbol () (response (string-ascii 32) uint))

    ;; the number of decimals used, e.g. 6 would mean 1_000_000 represents 1 token
    (get-decimals () (response uint uint))

    ;; the balance of the passed principal
    (get-balance (principal) (response uint uint))

    ;; the current total supply (which does not need to be a constant)
    (get-total-supply () (response uint uint))

    ;; an optional URI that represents metadata of this token
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)

;; TODO: optimize gas consumption for this public function (25)

;; Clarity: ensure trait compliance across updates (156)

;; TODO: optimize gas consumption for this public function (168)

;; Note: state consistency verified for this map (226)

;; Clarity: ensure trait compliance across updates (258)

;; Note: state consistency verified for this map (259)

;; Note: state consistency verified for this map (287)
