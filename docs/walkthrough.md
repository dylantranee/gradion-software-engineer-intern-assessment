# Project Walkthrough & Verification Journal

This document records the incremental progress, feature demonstrations, and verification milestones throughout the build.

---

## Milestone 0: Environment, Workspaces & Testing Harness Setup (Phase 0 Complete)

### Implemented & Verified Stories
* **`US-0.1`**: Configured monorepo workspaces (`["backend", "frontend"]`), shared domain types (`shared/types.ts`), and strict TypeScript configurations.
* **`US-0.2`**: Configured `.gitignore` (ignoring `.env`, `node_modules/`, `data/`, `dist/`) and created sanitized `.env.example` with `BACKEND_PORT=3001` and `FRONTEND_PORT=3000`.
* **`US-0.3`**: Created executable `./start.sh` with automatic environment check, missing dependency installer, and fullstack dev server runner.
* **`US-0.4`**: Created executable `./test.sh` running tests across backend and frontend workspaces.
* **`US-0.5`**: Configured Vitest test harness across backend (`backend/vitest.config.ts`) and frontend (`frontend/vite.config.ts` + jsdom + RTL). Verified initial test runs pass with 0 failures.
* **`US-0.6`**: Codified native Antigravity rules and assessment constraints in `AGENTS.md` and `docs/DECISIONS.md`.

---

## Milestone 1: Core Storage Layer & Concurrency Engine (Phase 1 Complete)

### Implemented & Verified Stories
* **`US-1.1`**: Implemented `JsonStore` in `backend/src/storage/jsonStore.ts` supporting directory self-initialization (`/data/projects`, `/data/assets`), user profile management (`users.json`), and project CRUD operations.
* **`US-1.2`**: Integrated `proper-lockfile` advisory write locks with UUID-tagged `.tmp` atomic file renaming to guarantee thread-safe concurrent disk writes without corruption.
* **`US-1.3`**: Implemented the Dual State Machine architecture decoupling durable milestone progress (`status`: `CREATED` → `DONE`) from in-flight step states (`stepState`: `IDLE`, `RUNNING`, `FAILED`).
* **`US-1.4`**: Implemented `PipelineMutex` in `backend/src/orchestrator/mutex.ts` with synchronous in-memory reservation (`activeLocks.add()`) to intercept simultaneous step execution and return `409 Conflict` before any async I/O.
* **`US-1.5`**: Implemented stranded lock timeout detection (`STUCK_TIMEOUT_MS = 60_000ms`) and safe state recovery (`recoverProject()`) to reset `stepState = 'IDLE'` while preserving all completed milestone progress.
* **`US-1.6`**: Implemented comprehensive unit/integration test suites in `backend/tests/storage.test.ts` (6 tests) and `backend/tests/mutex_and_state.test.ts` (5 tests), verified via `./test.sh` passing with 100% success (14/14 tests total).

---

## Milestone 2: Gemini API Integration Layer (Phase 2 Complete)

### Implemented & Verified Stories
* **`US-2.1`**: Implemented `GeminiClient` in `backend/src/gemini/client.ts` using `@google/genai` and `MockGeminiAdapter` in `backend/src/gemini/mockAdapter.ts` for offline deterministic testing with zero API quota consumption.
* **`US-2.2`**: Implemented manuscript text context extraction and reusability, eliminating duplicate token uploads across steps.
* **`US-2.3`**: Implemented Step 1: Art Style Generator (`gemini-2.5-flash`), enriching user-specified custom styles or deriving cohesive styles from narrative tone.
* **`US-2.4`**: Implemented Step 2: Characters Generator (`gemini-2.5-flash`) with structured JSON schema and **hard server-side cap: max 2 adult characters**.
* **`US-2.5`**: Implemented Step 3: Character Portraits Generator (`gemini-2.5-flash-image` Nano Banana) with cookbook negative system instructions ("no text, labels, signatures, borders, frames") and local PNG asset persistence.
* **`US-2.6`**: Implemented Step 4: Chapters Generator (`gemini-2.5-flash`) with structured JSON schema and **hard server-side cap: max 1 chapter scene**, referencing character visual traits.
* **`US-2.7`**: Implemented Step 5: Chapter Illustration Generator (`gemini-2.5-flash-image` Nano Banana) maintaining character visual continuity and marking project `DONE`.
* **`US-2.8`**: Implemented `PipelineOrchestrator` (`backend/src/orchestrator/pipeline.ts`) tying store, mutex, and Gemini together. Implemented `backend/tests/pipeline_gemini.test.ts` (6 integration tests). Verified via `./test.sh` passing with 100% success (20/20 tests total).

---

## Milestone 3: REST API Server & Multi-Tenant Endpoints (Phase 3 Complete)

### Implemented & Verified Stories
* **`US-3.1`**: Implemented passwordless authentication endpoints (`POST /api/auth/login`, `GET /api/auth/me`) and `requireAuth` middleware parsing `x-user-email`.
* **`US-3.2`**: Implemented project management CRUD routes in `backend/src/routes/projects.ts` (`GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`).
* **`US-3.3`**: Implemented multi-tenant project authorization guards: User B receives `403 Forbidden` when attempting to read or mutate User A's projects.
* **`US-3.4`**: Implemented pipeline step execution endpoint `POST /api/projects/:id/step/:stepKey` returning `200 OK` on success, `409 Conflict` on race conditions, and `400 Bad Request` on invalid prerequisites.
* **`US-3.5`**: Implemented stranded lock recovery endpoint `POST /api/projects/:id/recover` to release stuck locks and reset `stepState = 'IDLE'`.
* **`US-3.6`**: Implemented public image streaming route in `backend/src/routes/assets.ts` (`GET /api/projects/:id/assets/:filename`) returning `Content-Type: image/png` without requiring auth headers.
* **`US-3.7`**: Implemented comprehensive REST API Supertest integration suite in `backend/tests/api.test.ts` (18 tests). Verified via `./test.sh` passing with 100% success (38/38 tests total).

---

## Milestone 4: Frontend UI / UX Polish (Phase 4)
*(Pending Phase 4 execution)*

---

## Milestone 5: End-to-End Verification & Assessment Deliverables (Phase 5)
*(Pending Phase 5 execution)*
