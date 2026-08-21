# Project Task Tracker & Checklist

## Phase 0: Project Setup & Harness
- [x] Initialize repository workspace structure (`/backend`, `/frontend`, `/shared`, `/docs`)
- [x] Create `.gitignore` to prevent committing `.env`, `node_modules`, build artifacts, and runtime `/data`
- [x] Configure `AGENTS.md` and `.env.example` with Gemini model variables
- [x] Implement single-command `./start.sh` (environment check + dev server runner)
- [x] Implement single-command `./test.sh` (cross-workspace test runner)
- [x] Configure Vitest testing harness across backend and frontend workspaces
- [x] Establish initial Git baseline commit

## Phase 1: Storage Layer & Concurrency Engine
- [x] Implement local JSON file storage repository (`backend/src/storage/jsonStore.ts`)
- [x] Implement advisory file locking (`proper-lockfile`) for atomic disk writes
- [x] Implement Dual State Machine (`status` milestone + `stepState: IDLE | RUNNING | FAILED`)
- [x] Implement server-side Mutex with synchronous in-memory reservation (`409 Conflict`)
- [x] Implement stranded lock timeout detection (`STUCK_TIMEOUT_MS = 60s`) and recovery handler
- [x] Unit tests for storage, step ordering invariants, strict caps, and concurrency mutex

## Phase 2: Gemini API Integration Layer
- [x] Configure `@google/genai` client and REST service with `gemini-2.5-flash` and `gemini-2.5-flash-image` (Nano Banana)
- [x] Implement book text ingestion & single-upload context reusability (File API context caching)
- [x] Implement Step 1: Style generator (user input enrichment or Gemini narrative derivation)
- [x] Implement Step 2: Characters generator (strict **max 2 adult characters** cap + JSON schema)
- [x] Implement Step 3: Character Portraits generator (`gemini-2.5-flash-image` Nano Banana with local PNG saving)
- [x] Implement Step 4: Chapters generator (strict **max 1 chapter** cap + character visual trait referencing)
- [x] Implement Step 5: Chapter Illustration generator (`gemini-2.5-flash-image` Nano Banana with character context)
- [x] Integration tests with Gemini Mock adapter (deterministic offline generation)

## Phase 3: REST API Server & Endpoints
- [x] Identity endpoints (`POST /api/auth/login`, `GET /api/auth/me`) with `x-user-email` header
- [x] Project CRUD endpoints (`GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`) with multi-tenant isolation (`403 Forbidden`)
- [x] Step execution endpoint (`POST /api/projects/:id/step/:stepKey`)
- [x] Stranded lock recovery endpoint (`POST /api/projects/:id/recover`)
- [x] Static image asset streaming endpoint (`GET /api/projects/:id/assets/:filename`)

## Phase 4: Frontend UI / UX (Gradion Design System)
- [x] Configure Tailwind CSS with Gradion tokens (`--grad-orange`, `--grad-ink`, radii, fonts) and `lucide-react`
- [x] Implement HTML5 History API Router (`/login`, `/projects`, `/projects/new`, `/projects/:id`)
- [x] Build Identity / Auth View (`frontend/src/pages/AuthPage.tsx`)
- [x] Build Project Dashboard with status badges & 5-segment mini progress bar (`frontend/src/pages/ProjectListPage.tsx`)
- [x] Build New Project Ingestion View with `.txt` dropzone + direct text paste area (`frontend/src/pages/NewProjectPage.tsx`)
- [x] Build Project Workspace View with 5-step horizontal Stepper and sidebar (`frontend/src/pages/ProjectDetailPage.tsx`)
- [x] Build Character Cards (3:4 ratio) & Chapter Cards (16:9 ratio) with sequential visual reveals
- [x] Build Book Modal reader (`frontend/src/components/BookModal.tsx`) with Escape key handling
- [x] Build Loading spinner, In-Progress captions, and Error/Retry alert banners
- [x] Frontend component tests (`frontend/src/__tests__/`) with React Testing Library

## Phase 5: Verification, Documentation & Final Deliverables
- [ ] Execute full end-to-end user acceptance walkthrough
- [ ] Run full automated test suite (`./test.sh`) and capture raw output into `docs/TESTING.md`
- [ ] Finalize `docs/DECISIONS.md` (10 architectural decisions, 4 AI overrides, "One More Day" roadmap)
- [ ] Finalize `README.md` and documentation index
- [ ] Validate clean execution of `./start.sh` and `./test.sh` from a fresh shell
- [ ] Clean Git status check: verify `.env` and `/data/` are ignored and all source code is cleanly committed
