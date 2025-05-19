# Product Context: Smart Ledger Backend (Node.js)

**User Problem:** Users (likely internal finance/operations teams) need an automated and reliable system to track the complete lifecycle of financial transactions, ensuring that all expected monetary movements are accounted for, from initial event (e.g., sale) to final settlement in the bank. This system needs to provide clarity on where funds are at each stage.

**Target Users:** Internal teams managing financial reconciliation and operations.

**User Experience (UX) Expectations (for the API):**
- The service will be interacted with via a well-defined API.
- API requests should be idempotent where appropriate (e.g., processing a settlement report).
- API responses should be structured (JSON), clear, and provide sufficient detail for diagnostics.
- The system must maintain data integrity and accuracy for financial records.
- The `/api/health` endpoint provides a basic status check of the service and its database connection.

**Core User Stories (Illustrative, to be expanded):**
- As a finance user, I want to record a new sale so that revenue is recognized and expected funds from the PSP are tracked.
- As a finance user, I want to submit a PSP settlement report so that collected funds are confirmed, payouts are recorded, and expected bank deposits are tracked.
- As a finance user, I want to submit bank statement data so that actual bank deposits are confirmed and reconciled against expectations.
- As a finance user, I want to view the current status and balance of any account (e.g., Sales Revenue, PSP Holding, Bank Account) to understand fund positions.
- As a finance user, I want to see a list of outstanding expectations (e.g., funds expected from PSP, deposits expected in bank) to identify potential issues or delays.
