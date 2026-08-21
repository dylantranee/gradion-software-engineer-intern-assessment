# Testing Strategy & Automated Test Report

## 1. Testing Philosophy & Strategy

Tests target the invariants that are expensive to get wrong at runtime — step ordering, concurrency, resumability, and the hard Gemini cost caps — plus the frontend states a reviewer will actually click through. We are not chasing coverage percentage; a handful of components (forms, cards, the stepper) are deliberately left to manual verification because their logic is trivial prop-to-DOM mapping.

### What We Test

**Backend** (`backend/tests/`):
1. `pipeline_gemini.test.ts` — Step ordering and prerequisites (e.g. `CHARACTERS` cannot run before `STYLE`); the hard server-side caps (max 2 adult characters, max 1 chapter scene) are enforced even when the mocked Gemini adapter returns more; prompt construction always includes `NEGATIVE_PROMPT_INSTRUCTIONS` for image steps.
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
- **Live Gemini API calls.** All backend tests run against `mockGeminiAdapter`, never the real `@google/genai` client — this keeps the suite deterministic, fast, and free of quota burn. `GeminiClient` itself falls back to the same mock adapter automatically whenever a key is absent or a live call throws, so manual/local runs against the real API are exercised outside the automated suite.
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

 ✓ tests/sanity.test.ts (2 tests) 8ms
 ✓ tests/mutex_and_state.test.ts (5 tests) 35ms
 ✓ tests/pipeline_gemini.test.ts (7 tests) 147ms
 ✓ tests/storage.test.ts (6 tests) 798ms
   ✓ US-1.1 & US-1.2: Local JSON Storage Repository & Advisory Locking > US-1.2: handles concurrent atomic updates safely without corruption  762ms
 ✓ tests/api.test.ts (19 tests) 560ms

 Test Files  5 passed (5)
      Tests  39 passed (39)
   Start at  09:47:58
   Duration  1.58s (transform 475ms, setup 0ms, collect 1.40s, tests 1.55s, environment 3ms, prepare 711ms)


> frontend@1.0.0 test
> vitest run


 RUN  v3.2.7 /Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/frontend

 ✓ src/__tests__/Stepper.test.tsx (3 tests) 93ms
 ✓ src/__tests__/BookModal.test.tsx (5 tests) 172ms
 ✓ src/__tests__/AuthPage.test.tsx (3 tests) 320ms
 ✓ src/__tests__/ProjectListPage.test.tsx (4 tests) 343ms
 ✓ src/__tests__/App.test.tsx (4 tests) 380ms
 ✓ src/__tests__/NewProjectPage.test.tsx (7 tests) 676ms
 ✓ src/__tests__/ProjectDetailPage.test.tsx (38 tests) 1140ms
 ✓ src/__tests__/CharacterCard.test.tsx (3 tests) 74ms
 ✓ src/__tests__/sanity.test.tsx (1 test) 36ms
 ✓ src/__tests__/Router.test.tsx (3 tests) 84ms
 ✓ src/__tests__/ChapterCard.test.tsx (3 tests) 93ms
 ✓ src/__tests__/StatusPill.test.tsx (4 tests) 27ms

 Test Files  12 passed (12)
      Tests  78 passed (78)
   Start at  09:48:01
   Duration  6.91s (transform 1.18s, setup 2.31s, collect 17.64s, tests 3.44s, environment 10.25s, prepare 2.69s)
```

**Totals: 17 test files, 117 tests, 0 failures.**

> Note: `npm run build` currently fails on the backend workspace with pre-existing `tsc` errors (missing `rootDir` config for the shared `shared/` import, a couple of implicit-`any` parameters, and `string | string[]` narrowing on `req.params` in a few routes). `./test.sh` passing does not mean `npm run build` is clean — tracked as follow-up work, not part of this test report.
