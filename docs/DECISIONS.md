# Architectural Decisions & AI Collaboration Log

This document records the architectural and engineering decisions made during the development of the **Book Illustration Studio**, highlighting the dialogue, trade-offs, pushbacks, and explicit **AI overrides**.

---

## 1. Node.js + Express (TypeScript) with React/Vite over Monolithic Next.js

* **Proposal:** The AI initially proposed a full Next.js App Router application with Server Actions.
* **Pushback (Human / PM):** Overkill and risk-prone for this specific scope. Next.js App Router server actions complicate background file streaming, long-running image generation tasks (10–30s+), and atomic local disk write locking across concurrent client requests due to file-watching reloads.
* **Resolution (AI Override #1):** Separated the stack into a clean, lightweight Node.js/Express TypeScript backend and a React/Vite frontend.
* **Cost & Trade-offs:** Two separate package configurations during build, but guarantees zero framework magic, crystal-clear REST contracts, simple `./start.sh` execution, and rock-solid file-based concurrency control.

---

## 2. Local JSON Files with Advisory Write Locks instead of SQLite or Cloud DB

* **Proposal:** The AI proposed PostgreSQL with Prisma ORM or an embedded SQLite database.
* **Pushback (Human / PM):** The spec explicitly states a database is optional and values a right-sized solution without external system daemon dependencies. Cloud databases add network latency, connection pooling overhead, and deployment complexity for local-only execution.
* **Resolution (AI Override #2):** Implemented isolated per-user/per-project JSON state files on disk, guarded by `proper-lockfile` (advisory file locking) for atomic write operations.
* **Cost & Trade-offs:** No ACID multi-table transactions (acceptable since data is project-isolated). Write latency is slightly higher than in-memory SQLite, but zero setup dependencies and total file transparency on disk.

---

## 3. Dual State Machine (`status` + `stepState`) with Stranded Timeout Recovery

* **Proposal:** The AI proposed a single `status` enum (`CREATED`, `STYLE_RUNNING`, `STYLE_SET`, `CHARACTERS_RUNNING`, etc.).
* **Pushback (Human / PM):** A single enum cannot cleanly separate *pipeline milestone completion* from *transient execution state*. When a page refreshes mid-step, or when a step fails, the system must know both "which milestone was last completed successfully" and "is the current step idle, running, or failed".
* **Resolution:** Split state tracking into:
  - `status`: Overall project progress milestone (`CREATED`, `STYLE_SET`, `CHARACTERS_GENERATED`, `PORTRAITS_GENERATED`, `CHAPTERS_GENERATED`, `DONE`).
  - `stepState`: Transient status (`IDLE`, `RUNNING`, `FAILED`).
  - `stepStartedAt`: Timestamp for detecting stranded locks (`STUCK_TIMEOUT_MS = 60s`) and clearing them safely via `/recover`.
* **Cost & Trade-offs:** Requires keeping two state fields in sync upon step completion.

---

## 4. Server-Side Mutex Locking (`409 Conflict`) for Duplicate Execution Prevention

* **Proposal:** The AI proposed relying on client-side button disabling and UI debounce guards to prevent duplicate step execution.
* **Pushback (Human / PM):** Client-side guards are completely ineffective against multiple browser tabs, page refreshes mid-flight, or direct API calls via curl/Postman.
* **Resolution (AI Override #3):** Enforced atomic server-side mutex locking at the API controller layer with synchronous reservation before asynchronous I/O yields. If a project has `stepState === 'RUNNING'`, any subsequent step trigger immediately returns `409 Conflict` with in-flight details.
* **Cost & Trade-offs:** Requires an active lock timeout mechanism (`STUCK_TIMEOUT_MS = 60s`) and a `/recover` endpoint to handle edge cases where the server process crashes mid-API call.

---

## 5. Token Cost Discipline: Single Book Ingestion via Context Chaining

* **Proposal:** The AI suggested sending the full book text in the prompt payload of every single pipeline step.
* **Pushback (Human / PM):** Violates §4.3 ("Send the book's content to Gemini once and reuse it across steps"). For full-length books, sending tens of thousands of words 5 times drastically inflates token costs and latency.
* **Resolution:** Ingest book text once upon project creation using Gemini File API / Interactions context caching, and reference the cached file URI / interaction ID for subsequent step prompts.
* **Cost & Trade-offs:** Slightly more complex initial project setup logic, but cuts ongoing token usage by >75% across the pipeline.

---

## 6. Frontend UI Architecture: Tailwind CSS + Gradion Design Tokens + Lucide Icons

* **Proposal:** The AI initially considered relying strictly on static vanilla CSS copied verbatim from `app-demo.html` without utility classes or icon libraries.
* **Pushback (Human / PM):** The spec demands that our UI *"match or beat app-demo.html visually... app-demo.html is the floor, not the ceiling"*. Pure static CSS without utility composition slows down responsive micro-layout adjustments and lacks modern iconography.
* **Resolution:** Configured Tailwind CSS to directly wrap Gradion's Design System tokens (`--grad-orange`, `--grad-ink`, `--grad-paper`, radii, font scales) and integrated `lucide-react` for crisp visual affordances (spinners, books, arrows, status badges).
* **Cost & Trade-offs:** Adds Tailwind as a build dependency in Vite, but produces a modern, responsive interface with 100% brand fidelity.

---

## 7. Model Selection: `gemini-2.5-flash` (Text) & `gemini-2.5-flash-image` (Nano Banana Image)

* **Proposal:** The AI initially suggested using `imagen-3.0-generate-002` for images.
* **Pushback (Human / PM):** The assessment specification (§5.3) explicitly specifies using the **Nano Banana family** of models, matching the updated Google Gemini cookbook pipeline.
* **Resolution (AI Override #4):** Selected `gemini-2.5-flash` for high-speed structured text/JSON extraction and `gemini-2.5-flash-image` (Nano Banana) for visual asset generation, configured via `.env` variables with deterministic mock fallback for testing.
* **Cost & Trade-offs:** Aligns 100% with the cookbook and assessment requirement; free-tier quotas on the image model apply.

---

## 8. Passwordless Identity & Multi-Tenancy (`x-user-email` Header)

* **Proposal:** The AI proposed building full bcrypt password hashing and JWT sessions.
* **Pushback (Human / PM):** Full session authentication is unnecessary setup overhead for a local reviewer and introduces friction.
* **Resolution:** Used passwordless identity (Name + Email on welcome screen) stored in `users.json`, with the frontend transmitting `x-user-email` on API calls. The server isolates user projects and returns `403 Forbidden` if User B tries to view or modify User A's projects.
* **Cost & Trade-offs:** Zero login friction for evaluators while providing strict multi-tenant isolation.

---

## 9. Hash-Based Client Routing (`#/projects/:id`)

* **Proposal:** The AI proposed HTML5 History API (`BrowserRouter` / `pushState`).
* **Pushback (Human / PM):** HTML5 history routing requires server-side wildcard rewrite rules on both Vite and Express to prevent 404 errors on deep-link refreshes.
* **Resolution:** Used Hash-based routing (`#/`, `#/projects`, `#/projects/new`, `#/projects/:id`).
* **Cost & Trade-offs:** Hash symbols in URL, but 100% guaranteed to work out-of-the-box on any static or local dev server without wildcard rewrite issues.

---

## 10. Unified Fast Testing Harness with Vitest & Supertest

* **Proposal:** The AI proposed using Jest for backend and frontend.
* **Pushback (Human / PM):** Jest requires extensive `ts-jest` and Babel transpilation configuration and runs slower on ESM/TypeScript codebases.
* **Resolution:** Adopted Vitest across both workspaces (`server` and `client`) with Supertest for HTTP endpoint testing and `@testing-library/react` for UI components, executed through single-command `./test.sh`.
* **Cost & Trade-offs:** Blazing fast parallel execution, zero transpilation lag, and shared TypeScript configurations.

---

## If You Had One More Day, What Would You Build Next and Why?

If given one additional day, I would prioritize the following high-impact extensions:

1. **Server-Sent Events (SSE) / WebSocket Progress Streaming**:
   - Currently, sequential portrait generation writes progress to disk and returns upon completion of the step. Adding real-time SSE streaming would push live thumbnail chunks directly to the UI as each character's portrait renders on Gemini's servers, creating an even more tactile and responsive experience.
2. **Interactive Character & Scene Prompt Refinement Editor**:
   - Allow users to inspect and tweak the Gemini-generated character prompt before committing to portrait rendering (e.g. adjust outfit colors or artistic medium) while preserving the core structured pipeline constraints.
3. **Audiobook / Chapter Narration (TTS Integration)**:
   - Implement the optional section from the Gemini Cookbook using `gemini-3.1-flash-tts-preview` to generate atmospheric voice narration of the chapter opening alongside the scene illustration.
