# Architecture Decisions, Trade-Offs & AI Copilot Overrides

This document logs the major technical decisions, architectural trade-offs, and **explicit AI overrides** made during the engineering of the **Book Illustration Studio**.

**On AI-authorship disclosure**: every commit in this repository was made with Claude Code as the AI copilot (see `CLAUDE.md`/`AGENTS.md`) — including the ones whose message doesn't say so. Per-commit disclosure (a body line, `Co-Authored-By`, etc.) wasn't applied consistently: it appeared partway through the project, then was deliberately dropped again in favor of single-line commit messages, which is this repo's house style. This paragraph is the disclosure instead of a per-commit one.

---

## 1. Architectural Decisions Matrix

### Monorepo workspace structure (`/backend`, `/frontend`, `/shared`)
Considered a monolithic single-package Express+Vite app and fully separate repositories before settling on a root `npm workspaces` monorepo (`/backend` Express, `/frontend` React+Vite, `/shared` TypeScript domain types, `/docs`). The deciding factor is `/shared`: `Project`, `CharacterEntity`, `StepKey`, and the rest need to be identical on both sides of the API boundary, and a workspace lets both sides import them directly with no package-publishing step. Cost: needs root-level script orchestration (`concurrently`) to run both dev servers as one `npm run dev`.

### State persistence — local JSON with advisory file locks
Weighed embedded SQLite, Postgres/Prisma, and lowdb against flat JSON files before choosing local disk JSON (`/data/projects/:id.json`) guarded by `proper-lockfile` advisory locks and atomic rename writes. Cost: not suitable for a distributed multi-server cluster — but that's out of scope here; it eliminates any external DB binary or connection setup entirely, so running the app locally has zero extra friction (see §5.2 in the assessment brief, and Override 2 below for the fuller back-and-forth on this one).

### Local image asset storage & direct Express streaming
Considered S3/Cloudflare R2 and in-memory base64 data URLs embedded directly in the project JSON before choosing binary PNG files written to `/data/projects/:id/assets/`, streamed over HTTP via `GET /api/projects/:id/assets/:filename` with `Content-Type: image/png`. Cost: requires actual disk-space management, but avoids bloating every project JSON read/write with megabytes of base64 and lets the browser cache images the normal way.

### Concurrency guard — synchronous in-memory mutex + 409 Conflict
Considered relying on client-side button disabling alone, database row locking, or an in-memory server mutex — landed on a server-side `PipelineMutex` (an in-memory `Set<string>` of active locks) combined with the persisted `stepState` check, returning `409 Conflict` on a simultaneous request. Cost: the in-memory lock set resets on server restart, but that's covered by the 60-second stranded-lock timeout and `/recover` endpoint below, so a restart mid-step never leaves a project permanently stuck.

### Resilience & stranded-lock recovery — dual state machine
Considered a single `status` enum with intermediate `_IN_PROGRESS`-style values versus splitting it in two — landed on `status` (permanent milestones, `CREATED` → `DONE`) separate from `stepState` (transient execution: `IDLE`/`RUNNING`/`FAILED`), with a stranded `RUNNING` lock expiring after `STUCK_TIMEOUT_MS = 60s` and clearable via a dedicated `/recover` endpoint. Cost: one more field to keep in sync on every transition, in exchange for a guarantee that a server crash or interruption never loses a user's completed progress.

### Google Gemini text model
Chose `gemini-2.5-flash` over `gemini-1.5-pro` for the text/structured-extraction steps — faster response (~0.8–1.2s) and reliable JSON-schema-constrained output won out over `1.5-pro`'s higher raw capability. This decision went stale mid-project: see Override 7 below for the live-discovered retirement and the switch to the `gemini-flash-latest` alias.

### Google Gemini visual model — Nano Banana
Chose `gemini-2.5-flash-image` over `imagen-3.0-generate-002` for portrait/illustration generation — it's the actual **Nano Banana** multimodal model the reference cookbook uses, and it follows book-style prompts and keeps characters visually consistent with sub-second generation, which Imagen 3 (a separate, non-multimodal pipeline) doesn't do as directly. See also Override 4.

### Identity & multi-tenancy — passwordless `x-user-email` header
Considered full JWT/OAuth2/session-cookie auth against a simple email-based identity — chose passwordless: users live in `data/users.json`, every request sends `x-user-email`, and a returning login is matched by normalized email and restores their project history. Cost: no cryptographic signature verification on the identity header — fine for a local/internal evaluation tool, not something to carry into a real deployment — but it gets multi-tenancy testing working instantly with no auth-provider setup.

### Client-side routing — HTML5 History API
Considered a hash router (`#/projects/:id`) against the HTML5 History API before writing a small custom router (`frontend/src/router.tsx`: `pushState`/`popstate`, `RouterProvider`, `useRouter()`, `<Link>`) for clean URLs (`/login`, `/projects`, `/projects/new`, `/projects/:id`). No real cost beyond writing the routing ourselves instead of pulling in a library — worth it for URLs that read like a real product instead of a SPA hash hack. See also Override 5.

### In-progress feedback & captions
Considered a generic spinner against an in-flight button lock with live contextual captions (e.g. *"Generating structured character prompts…"*, *"Rendering portrait artwork with Nano Banana…"*) plus polling — chose the latter, since real Gemini calls run 10–30s+ and a bare spinner gives no signal the app hasn't just frozen. Cost: needs frontend timers and a step-to-caption text mapping to maintain, in exchange for a UI that doesn't read as stuck during a long call.

---

## 2. Explicit AI Copilot Overrides

During development, the AI assistant proposed approaches that were evaluated, challenged, and explicitly overridden. Overrides 1–5 are the classic pattern (human catching AI). Override 6 came from an AI-run audit against the assessment brief that the human then directed be fixed. Override 7 is a pure self-correction — this session's own rewrite caught an earlier decision going stale, verified against the live API rather than assumed. None of these are the assessment's other suggested case (AI catching a *human* mistake) — that genuinely didn't happen here, so it isn't faked.

### Override 1: Rejection of Next.js fullstack framework
Claude's first pass proposed Next.js 14's App Router so frontend and backend could live in one framework. Rejected it — Next's server actions and edge-runtime API routes introduce filesystem write instability for local JSON files, plus heavy build overhead the project doesn't need. Went with a decoupled Express backend (`/backend`) and Vite frontend (`/frontend`) instead.

### Override 2: Rejection of external PostgreSQL database
Claude's first pass proposed PostgreSQL with Prisma ORM (or Docker Compose to run it) for project persistence. Rejected it: the assessment explicitly allows disk-based storage as a valid choice at this scope ("JSON files on disk genuinely fit this scope, if done properly"), and a real DB would add a service a reviewer has to install and configure just to run the app locally — friction that buys nothing at this data volume. Went with atomic local JSON files guarded by `proper-lockfile` advisory locks instead.

### Override 3: Rejection of purely client-side button disabling for concurrency
Claude's first pass proposed relying on React state (`disabled={isLoading}`) on the action button to prevent duplicate step submissions. Rejected it — a purely client-side guard does nothing if the user opens a second tab, refreshes mid-step, or hits the API directly via curl/Postman, any of which would burn a real Gemini call. Enforced server-side atomic mutex locking (`409 Conflict` on a concurrent request) before any async I/O begins instead.

### Override 4: Correction of visual model to the authentic Nano Banana family
Claude's first pass proposed `imagen-3.0-generate-002` for image generation. Rejected it — the assessment and the reference cookbook specifically call for the **Nano Banana** multimodal family, not Imagen. Switched to `gemini-2.5-flash-image`.

### Override 5: Adoption of HTML5 History API routing
Claude's first pass proposed a hash-based router (`#/projects/:id`). Rejected it — wanted standard HTML5 History API URLs (`/projects`, `/projects/:id`) without hash fragments, for modern browser semantics and URLs that don't look dated. Implemented the HTML5 History API router (`RouterProvider`, `useRouter()`, `<Link>`) in `frontend/src/router.tsx` instead.

### Override 6: Replacing per-step `generateContent` calls with the notebook's actual chaining mechanism

The original Gemini client (the "Google Gemini text/visual model" decisions above) called `models.generateContent` independently for each text step, re-sending a truncated copy of the book text (`bookText.substring(0, 3000–4000)`) on every STYLE/CHARACTERS/CHAPTERS call, with no File API upload and no conversation memory between calls — `Project.geminiFileUri` was declared in the schema but never actually referenced anywhere in the codebase. This directly contradicted §4.3's "send the book once and reuse it across steps" requirement, and it wasn't what the reference notebook does.

I pulled the actual notebook JSON (not a summary — I don't trust an LLM's paraphrase of API code without checking, so I fetched the raw `.ipynb` and read the real cells) and it uses `client.files.upload()` once, then `client.interactions.create(..., previous_interaction_id=...)` chained across every step — including chaining the chapter-illustration image calls off the *portrait* image calls, so the model can literally see its own earlier portraits when drawing the chapter scene. That's a real quality improvement our old code didn't have at all: it only repeated a text description of the characters into the illustration prompt, never any actual visual reference.

Rebuilt `GeminiClient` around `ai.interactions.create` + `ai.files.upload`, added `geminiFileUri` / `geminiTextInteractionId` / `geminiImageInteractionId` to `Project` so the chain survives across separate HTTP requests and server restarts (each step just persists a string id, no in-memory chat object needed — this is what makes it compatible with our stateless resumability model). Kept the same `gemini-2.5-flash` / `gemini-2.5-flash-image` model choice rather than jumping to the notebook's `gemini-3.x` family, since those weren't independently verified against this project's own key/quota.

**Cost**: more moving state to keep consistent (three new `Project` fields, all optional, all threaded through five call sites in `pipeline.ts`), and the mock adapter now has to fabricate plausible interaction ids to keep the same code path exercised in tests as production.

### Override 7: `gemini-2.5-flash` had actually been retired (self-correction, not an AI-vs-human one)

While manually testing Override 6's rewrite against the real API (with a real key — not just against the mock), the very first live call came back `404: This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash.` The "Google Gemini text model" decision above was a defensible choice when it was made; it just went stale. Rather than hardcode `gemini-3.6-flash` and risk the same problem again in a few months, switched `GEMINI_TEXT_MODEL` to the `-latest` alias family (`gemini-flash-latest`), which Google keeps pointed at whatever the current recommended flash model is. Re-ran the same manual test after the change — real File API upload, real chained style/characters/portrait calls, all succeeded (verified by actually looking at a generated portrait, not just trusting a 200 response).

This also caught a real test-isolation bug as a side effect: `backend/tests/api.test.ts` builds the real `app.ts`, which was wired to the real `geminiClient` singleton whenever `.env` had a real key — meaning the automated suite had been silently making one live network call per run all along, and only ever "passed" because the stale model name made it fail fast (under the 5s test timeout) before falling into the mock fallback. Fixed by forcing `GEMINI_API_KEY=''` in `backend/vitest.config.ts`'s `test.env`, so the suite is deterministic and quota-free regardless of what's in the developer's local `.env`.

---

## 3. "One More Day"

EPUB/PDF export — compile the manuscript, established art style, character portraits, and chapter illustration into a single downloadable illustrated eBook. It's the natural finish line for the pipeline: right now a completed project is just a page you can look at, not something you walk away with, and that's the gap between "the AI generated some assets" and "the user has a book."
