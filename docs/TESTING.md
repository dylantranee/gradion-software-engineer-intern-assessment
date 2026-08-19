# Testing Strategy & Automated Test Report

## 1. Testing Philosophy & Strategy

This project adheres to a high-leverage testing strategy designed to enforce system invariants, prevent regression, and verify critical constraints across both backend and frontend layers:

### What We Test
1. **Pipeline Step Sequencing & Invariants (`server/tests/pipeline.test.ts`)**:
   - Verification that steps cannot execute out of order (e.g., Step 2 Characters cannot run before Step 1 Style).
   - Happy path sequential execution across all 5 steps (Style → Characters → Portraits → Chapters → Illustrations).
2. **Concurrency & Double-Execution Prevention (`server/tests/pipeline.test.ts`)**:
   - Verification that simultaneous or overlapping triggers of the same step reject duplicate requests with `409 Conflict` (verifying server-side atomic mutex locking).
3. **Resilience & State Recovery (`server/tests/pipeline.test.ts`)**:
   - Verification that failed steps can be retried independently without affecting completed milestones.
   - Verification that stranded/stuck locks time out and recover cleanly via `/recover`.
4. **Hard Server-Side Caps & Multi-Tenant Isolation (`server/tests/caps_and_auth.test.ts`)**:
   - Verification of the hard server-enforced cap of **maximum 2 adult characters** in Step 2.
   - Verification of the hard server-enforced cap of **maximum 1 chapter scene** in Step 4.
   - Verification that User B cannot view, modify, or execute pipeline steps on User A's projects (403 Forbidden).
   - Verification that generated portrait and illustration assets are streamed with `image/png` content headers without requiring bearer headers for `<img>` tags.
5. **Frontend State & Visual Contracts (`client/src/__tests__/`)**:
   - Verification of Stepper rendering, active ring-pulse animations, and completed milestone checkmarks (`Stepper.test.tsx`).
   - Verification of Status Pill states across `Draft`, `In progress`, and `Done` (`StatusPill.test.tsx`).
   - Verification of Book Modal rendering, accessibility attributes, and keyboard Escape close handling (`BookModal.test.tsx`).

### What We Deliberately Do Not Test
- **Live Gemini API Token Burning**: We avoid firing live external network requests to Google Gemini in automated unit/integration tests to preserve rate limits, avoid non-deterministic latency, and prevent unnecessary billing. External Gemini calls are isolated behind a mockable service interface with deterministic offline generation.
- **Brittle CSS Pixel Snapshots**: Layout and aesthetic responsiveness are verified via targeted component DOM tests and live browser execution against Gradion Design System tokens.

---

## 2. Automated Test Run Report

*(Pending execution of test suite upon Phase 5)*

```
[Test output will be captured here during implementation]
```
