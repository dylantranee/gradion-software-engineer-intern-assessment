# Testing Strategy & Automated Test Report

## 1. Testing Philosophy & Strategy

Tests target the invariants that are expensive to get wrong at runtime — step ordering, concurrency, resumability, and the hard Gemini cost caps — plus the frontend states a reviewer will actually click through. We are not chasing coverage percentage; a handful of components (forms, cards, the stepper) are deliberately left to manual verification because their logic is trivial prop-to-DOM mapping.

### What We Test

**Backend** (`backend/tests/`):
1. `pipeline_gemini.test.ts` — Step ordering and prerequisites (e.g. `CHARACTERS` cannot run before `STYLE`); the hard server-side caps (max 2 adult characters, max 1 chapter scene) are enforced even when the mocked Gemini adapter returns more; the book is uploaded/primed exactly once regardless of how many steps run, and every later step chains off the *previous interaction id* rather than resending the book text (this is what `Project.geminiFileUri`/`geminiTextInteractionId`/`geminiImageInteractionId` exist for — see `docs/DECISIONS.md`, "Cost discipline").
2. `mutex_and_state.test.ts` — `PipelineMutex` rejects a second concurrent `executeStep` call on the same project with `ConflictError` (→ `409`); stranded-lock detection (`stepState === 'RUNNING'` past `STUCK_TIMEOUT_MS`).
3. `storage.test.ts` — `JsonStore` atomic writes under concurrent updates (no corruption, no lost writes) via `proper-lockfile`.
4. `api.test.ts` — Full REST surface: auth provisioning/lookup, multi-tenant isolation (`403` when User B touches User A's project), step execution happy path and `400` on missing prerequisites, `/recover` clearing a stranded lock without discarding completed pipeline data, asset streaming with `image/png` headers.
5. `sanity.test.ts` — Environment/import sanity check.

**Frontend** (`frontend/src/__tests__/`):
- `ProjectDetailPage.test.tsx` (38 tests) — the largest suite: route guard states (loading, 404, 403-forbidden, network/5xx fetch failure vs. not-found), the stepper's done/current/pending badges, all five step action panels, in-flight state (button removal, spinner, live polling interval, ticker cadence, Status Pill omission on this page), scroll-into-view transitions on step completion, character/chapter card placeholder → reveal → image-load-failure fallback, the manuscript modal (open/close/Escape/backdrop-click), and the error banner / stranded-recovery flow.
- `ProjectListPage.test.tsx`, `NewProjectPage.test.tsx`, `AuthPage.test.tsx` — loading/error/empty states and field validation for the other three required screens.
- `Stepper.test.tsx`, `StatusPill.test.tsx`, `CharacterCard.test.tsx`, `ChapterCard.test.tsx`, `BookModal.test.tsx` — component-level contracts in isolation (badge states, pill variants, image-load fallback, keyboard/backdrop dismissal).
- `App.test.tsx`, `Router.test.tsx` — route-guard redirects (unauthenticated → `/login`, authenticated → `/projects`) and the custom History API router.
- `sanity.test.tsx` — environment sanity check.

### What We Deliberately Do Not Test
- **Live Gemini API calls.** All backend tests run against `mockGeminiAdapter`, never the real `@google/genai` client — this keeps the suite deterministic, fast, and free of quota burn. `backend/vitest.config.ts` forces `GEMINI_API_KEY=''` for the test run specifically so this holds even when the developer's local `.env` has a real key (it didn't always — `api.test.ts` was silently making one live network call per run before this was added; see `docs/DECISIONS.md`, "Gemini models"). `GeminiClient` itself falls back to the same mock adapter automatically whenever a key is absent or a live call throws, logging a warning so the fallback is never silent; manual/local runs against the real API (including the actual Interactions-API chaining and File API upload) are exercised outside the automated suite.
- **Pixel-level CSS/layout snapshots.** Visual polish (spacing, responsive breakpoints) is verified manually in-browser against the Gradion design tokens, not via snapshot testing — snapshots are brittle and don't catch the things that actually matter (a broken breakpoint, a layout jump).
- **True end-to-end browser tests.** Not required per the assessment brief; component + integration tests at the Vitest/RTL level give faster, more targeted feedback for a project this size.

---

## 2. Automated Test Run Report

Real output of `./test.sh` (`npm test` → `vitest run` in each workspace), captured on 2026-08-21, Node v24.18.0:

```
=========================================
 Running Book Illustration Studio Test Suite
=========================================
Running Backend & Frontend Tests...

> book-illustration-studio@1.0.0 test
> npm run test --workspace=backend && npm run test --workspace=frontend


> backend@1.0.0 test
> vitest run


 RUN  v3.2.7 /Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/backend

 ✓ tests/sanity.test.ts (2 tests) 5ms
 ✓ tests/mutex_and_state.test.ts (5 tests) 32ms
 ✓ tests/storage.test.ts (6 tests) 408ms
   ✓ US-1.1 & US-1.2: Local JSON Storage Repository & Advisory Locking > US-1.2: handles concurrent atomic updates safely without corruption  364ms
 ✓ tests/pipeline_gemini.test.ts (8 tests) 198ms
 ✓ tests/api.test.ts (19 tests) 324ms

 Test Files  5 passed (5)
      Tests  40 passed (40)
   Start at  10:07:12
   Duration  1.66s (transform 361ms, setup 0ms, collect 1.23s, tests 967ms, environment 2ms, prepare 1.07s)


> frontend@1.0.0 test
> vitest run


 RUN  v3.2.7 /Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/frontend

 ✓ src/__tests__/CharacterCard.test.tsx (3 tests) 92ms
 ✓ src/__tests__/BookModal.test.tsx (5 tests) 255ms
 ✓ src/__tests__/AuthPage.test.tsx (3 tests) 341ms
 ✓ src/__tests__/ProjectListPage.test.tsx (4 tests) 433ms
 ✓ src/__tests__/App.test.tsx (4 tests) 475ms
 ✓ src/__tests__/ChapterCard.test.tsx (3 tests) 107ms
 ✓ src/__tests__/NewProjectPage.test.tsx (7 tests) 707ms
 ✓ src/__tests__/ProjectDetailPage.test.tsx (38 tests) 1262ms
 ✓ src/__tests__/Router.test.tsx (3 tests) 69ms
 ✓ src/__tests__/sanity.test.tsx (1 test) 41ms
 ✓ src/__tests__/Stepper.test.tsx (3 tests) 47ms
 ✓ src/__tests__/StatusPill.test.tsx (4 tests) 60ms

 Test Files  12 passed (12)
      Tests  78 passed (78)
   Start at  10:07:15
   Duration  8.00s (transform 1.41s, setup 2.23s, collect 17.58s, tests 3.89s, environment 12.33s, prepare 3.18s)
```

**Totals: 17 test files, 118 tests, 0 failures.**

> Note: `npm run build` now succeeds cleanly on both workspaces (verified from a fully clean state, including actually booting `node dist/src/index.js` and hitting `/api/health`). It didn't for most of development — `tsc --noEmit` passing was never actually checked here, only `./test.sh` (which runs on `tsx`/`vitest`, neither of which needs a real `tsc` emit). The root causes turned out to be real: every `backend/src/**` file importing `shared/types.js` had the wrong number of `../` segments (silently never surfaced at runtime because they're type-only imports that esbuild/tsx erase before ever resolving the path), `shared/` needed its own `tsconfig.json` with TS project references so backend's `rootDir` didn't have to span both directories, `@types/express@^5` was installed against a real `express@^4` runtime, and `backend/package.json`'s `start` script pointed at `dist/index.js` when the actual output lands at `dist/src/index.js`. `backend/package.json`'s `build` script is now `tsc --build` so the `shared` project reference gets built first automatically.
