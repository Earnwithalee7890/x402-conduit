# System Architecture
```mermaid
graph TD
    A[AI Agent] -->|Discover| B[Conduit Marketplace]
    A -->|Pay x402| C[Stacks Blockchain]
    B -->|Verify Payment| C
    B -->|Consume API| D[External Services]
    D -->|Return Data| B
    B -->|Response| A
```
