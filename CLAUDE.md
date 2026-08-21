# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Book Illustration Studio — an AI-assisted app that turns a book manuscript into a consistent set of illustrations (art style, character portraits, one chapter scene) via the Google Gemini API. Node/Express (TypeScript) backend, React + Vite (TypeScript) frontend, npm workspaces monorepo (`backend`, `frontend`, shared `shared/`).

## Commands

```bash
./start.sh          # copies .env.example -> .env if missing, npm install if needed, runs `npm run dev`
npm run dev          # concurrently runs backend (tsx watch, port 3001) + frontend (vite, port 3000)
npm run build        # builds backend (tsc) then frontend (tsc && vite build)
npm start            # runs built backend (node dist/index.js)
./test.sh            # runs `npm test`
npm test             # runs backend tests then frontend tests (vitest run in each workspace)
```

Run a single test file/suite directly from the relevant workspace:
```bash
cd backend && npx vitest run tests/pipeline_gemini.test.ts
cd frontend && npx vitest run src/__tests__/BookModal.test.tsx
```

Environment config lives in root `.env` (copied from `.env.example`): `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL`, `BACKEND_PORT`, `FRONTEND_PORT`, `STORAGE_DIR`. Without a real `GEMINI_API_KEY`, `GeminiClient` (`backend/src/gemini/client.ts`) falls back to `mockGeminiAdapter` for every call (both when the key is absent/placeholder and when a live Gemini call throws) — deterministic mock data keeps dev/tests runnable offline.

## Architecture

**Data flow / storage**: There is no database. `JsonStore` (`backend/src/storage/jsonStore.ts`) persists everything as JSON files under `STORAGE_DIR` (default `./data`): one file per project (`data/projects/<id>.json`), generated images under `data/assets/<projectId>/`, and a flat `data/users.json`. Writes go through `proper-lockfile`-guarded atomic writes (write to temp file, rename). This is intentional for the assessment scope — don't reach for a real DB.

**Auth**: Passwordless/header-based. `requireAuth` middleware (`backend/src/middleware/auth.ts`) reads `x-user-email` from the request, auto-provisions a `User` on first sight (no passwords, no sessions/tokens). The frontend stores the resolved user in `localStorage` and attaches the header on every API call (`frontend/src/api.ts`). Every project is scoped to `userId`; routes double-check `project.userId === req.user.id` and return 403 otherwise (multi-tenant isolation).

**Pipeline (the core domain concept)**: A `Project` moves through 5 ordered steps defined in `shared/types.ts` (`StepKey`: `STYLE → CHARACTERS → PORTRAITS → CHAPTERS → ILLUSTRATIONS`), tracked by a **dual state machine** on the project: `status` (a `PipelineStatus` milestone, e.g. `CHARACTERS_GENERATED`) plus `stepState` (`IDLE | RUNNING | FAILED`, transient execution state). `PipelineOrchestrator` (`backend/src/orchestrator/pipeline.ts`) validates step prerequisites (can't run `PORTRAITS` before `CHARACTERS` exists, etc.), then executes under a mutex.

**Concurrency control — two layers, don't confuse them**:
- `PipelineMutex` (`backend/src/orchestrator/mutex.ts`): in-process, synchronous `Set`-based lock per `projectId`. Guards against two concurrent requests both entering `executeStep` for the same project; throws `ConflictError` → HTTP 409 immediately (no queueing/waiting).
- `JsonStore.startStep`/`isLockStranded` (`backend/src/storage/jsonStore.ts`): persisted lock via `stepState === 'RUNNING'` + `stepStartedAt`, survives process restarts. If a step has been `RUNNING` for over `STUCK_TIMEOUT_MS` (60s), it's considered stranded/crashed. `POST /:id/recover` clears both the in-memory mutex (`forceUnlock`) and resets `stepState` to `IDLE` without discarding completed pipeline data.

**Hard caps enforced server-side** (not just prompted for — sliced after the Gemini response): max 2 adult characters (`rawCharacters.slice(0, 2)` in `runStepCharacters`), exactly/max 1 chapter illustration (`rawChapters.slice(0, 1)` in `runStepChapters`). Never trust the model to self-limit; the cap is applied in `pipeline.ts` after every generation call.

**Gemini integration** (`backend/src/gemini/`): `IGeminiService` interface (`types.ts`) has two implementations — `GeminiClient` (real API, `@google/genai`, via the **Interactions API** — `ai.interactions.create`, the notebook's `client.interactions.create`/`previous_interaction_id` conversation-chaining mechanism) and `MockGeminiAdapter` (deterministic offline fixtures, used in tests and as the automatic fallback on any error — logs a `console.warn` when it falls back so a misconfigured key doesn't fail silently). Every generation call chains off a `previousInteractionId` instead of re-sending the book text or prior results — see "Book text upload" below. Text steps (style, characters, chapters) use `config.geminiTextModel` (default `gemini-flash-latest`, a "-latest" alias so it never silently points at a retired snapshot — `gemini-2.5-flash` itself was retired for new API keys, confirmed live during development) with a JSON-Schema `response_format` for structured output. Image steps (portraits, illustrations) use `config.geminiImageModel` (default `gemini-2.5-flash-image`, "Nano Banana") and always append `NEGATIVE_PROMPT_INSTRUCTIONS` (from `types.ts`, via the `promptBuilders` helpers) to suppress unwanted artifacts. Pure prompt-text builders live in `promptBuilders` (`types.ts`) specifically so they're unit-testable without touching the network — don't inline prompt strings back into `client.ts`.

**Book text upload & conversation chaining**: `Project.geminiFileUri` is set once, on the project's first STYLE run, by `GeminiClient.primeBook()` (Gemini File API upload + a priming interaction). `Project.geminiTextInteractionId` tracks the head of the *text* chain (book -> style -> characters -> chapters); `Project.geminiImageInteractionId` tracks the head of the *image* chain (portraits -> illustrations, so illustrations can refer back to the generated portraits for character consistency). `pipeline.ts` reads the relevant chain id off the `Project` before each Gemini call and persists the new one afterward — this is what makes the "send the book once" cost-discipline rule (§4.3) hold across separate HTTP requests and server restarts, since nothing but a string id needs to survive between steps. **Vitest forces `GEMINI_API_KEY=''`** (`backend/vitest.config.ts`) so the test suite always hits the mock adapter, never the live API, regardless of what's in the developer's local `.env`.

**Routes** (`backend/src/routes/`, all mounted under `/api/projects` except `auth`): `assetsRouter` is mounted *before* `projectsRouter` in `app.ts` and is deliberately unauthenticated (no `x-user-email` check) so plain `<img src>` tags can load generated images without custom headers — keep that ordering and public-ness when editing `app.ts`. `pipelineRouter` (`POST /:id/step/:stepKey`, `POST /:id/recover`) requires auth and enforces the 403 ownership check per-request, not just at the store layer.

**Progressive persistence**: During `PORTRAITS`, each character's image is saved and the project file updated immediately after each character (not batched at the end), so frontend polling can render portraits as they land one-by-one rather than waiting for the whole step.

**Frontend routing**: No react-router — a minimal custom `pathname`/`navigate` context in `frontend/src/router.tsx` (listens to `popstate`, wraps `history.pushState`). Use its `<Link>`/`useRouter()` rather than introducing a routing library.

**Design system**: Gradion tokens (`--grad-orange`, `--grad-ink`, etc.) defined in `frontend/src/index.css`/Tailwind config — reuse existing tokens rather than hardcoding colors.

## Docs

`/docs` holds the full planning trail — check these before making architectural changes, since several decisions were deliberate rejections of "more standard" choices:
- `docs/DECISIONS.md` — 5 decisions with trade-offs, each carrying its own AI-assistant override (Next.js rejected, Postgres rejected, client-side locking rejected, Imagen 3 corrected to Nano Banana, a retired Gemini model caught live, and the Gemini client rebuilt around conversation chaining instead of resending the book per step).
- `docs/plan.md` — implementation plan, pipeline mechanics, negative-prompt rules, state machine spec.
- `docs/architecture.md` — architecture diagram, REST endpoint list, TS data models.
- `docs/user-stories.md` — Gherkin acceptance criteria (`US-0.1`…`US-5.1`).
- `docs/TESTING.md` — testing philosophy, ordering invariants, cap enforcement tests.
- `AGENTS.md` — condensed core constraints (caps, resilience, cost, UI) for quick reference.
