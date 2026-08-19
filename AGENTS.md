# Agent Guidelines & Repository Context (Antigravity & AI Copilots)

This repository follows the Gradion Take-Home Assessment specifications for **Book Illustration Studio**.

## Context & Planning Documentation
- Assessment Requirements: [docs/gradion-assessment-intern-software-engineer.md](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/gradion-assessment-intern-software-engineer.md)
- Master Implementation Plan: [docs/plan.md](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/plan.md)
- Active Tasks & Checklist: [docs/tasks.md](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/tasks.md)
- System Architecture: [docs/architecture.md](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/architecture.md)
- Walkthrough & Verification: [docs/walkthrough.md](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/walkthrough.md)

## Automated Logging Protocols
- Architectural decisions, trade-offs, and explicit AI overrides -> [docs/DECISIONS.md](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/DECISIONS.md)
- Testing strategy and raw test execution outputs -> [docs/TESTING.md](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/TESTING.md)

## Core System Constraints
1. **Caps**: Exactly/Max 2 adult characters in Step 2; Exactly/Max 1 chapter illustration in Step 4 (server-enforced).
2. **Resilience**: Dual state machine (`status` + `stepState`), server-side mutex lock (`409 Conflict`), and stranded lock recovery (`STUCK_TIMEOUT_MS = 60s`).
3. **Cost**: Book text uploaded/cached once via Gemini File API; retries are user-triggered only.
4. **UI**: Gradion Design System tokens (`--grad-orange`, `--grad-ink`), live in-progress step captions, sequential portrait reveals, full book modal reader.

## Core Commands Reference
- Start application: `./start.sh` (or `npm run dev`)
- Run all tests: `./test.sh` (or `npm test`)
