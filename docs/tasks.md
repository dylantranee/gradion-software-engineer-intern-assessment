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
- [ ] Implement local JSON file storage repository (`backend/src/storage/jsonStore.ts`)
- [ ] Implement advisory file locking (`proper-lockfile`) for atomic disk writes
- [ ] Implement Dual State Machine (`status` milestone + `stepState: IDLE | RUNNING | FAILED`)
- [ ] Implement server-side Mutex with synchronous in-memory reservation (`409 Conflict`)
- [ ] Implement stranded lock timeout detection (`STUCK_TIMEOUT_MS = 60s`) and recovery handler
- [ ] Unit tests for storage, step ordering invariants, strict caps, and concurrency mutex

## Phase 2: Gemini API Integration Layer
- [ ] Configure `@google/genai` client and REST service with `gemini-2.5-flash` and `gemini-2.5-flash-image` (Nano Banana)
- [ ] Implement book text ingestion & single-upload context reusability (File API context caching)
- [ ] Implement Step 1: Style generator (user input enrichment or Gemini narrative derivation)
- [ ] Implement Step 2: Characters generator (strict **max 2 adult characters** cap + JSON schema)
- [ ] Implement Step 3: Character Portraits generator (`gemini-2.5-flash-image` Nano Banana with local PNG saving)
- [ ] Implement Step 4: Chapters generator (strict **max 1 chapter** cap + character visual trait referencing)
- [ ] Implement Step 5: Chapter Illustration generator (`gemini-2.5-flash-image` Nano Banana with character context)
- [ ] Integration tests with Gemini Mock adapter (deterministic offline generation)

## Phase 3: REST API Server & Endpoints
- [ ] Identity endpoints (`POST /api/auth/login`, `GET /api/auth/me`) with `x-user-email` header
- [ ] Project CRUD endpoints (`GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`) with multi-tenant isolation (`403 Forbidden`)
- [ ] Step execution endpoint (`POST /api/projects/:id/step/:stepKey`)
- [ ] Stranded lock recovery endpoint (`POST /api/projects/:id/recover`)
- [ ] Static image asset streaming endpoint (`GET /api/projects/:id/assets/:filename`)

## Phase 4: Frontend UI / UX (Gradion Design System)
- [ ] Configure Tailwind CSS with Gradion tokens (`--grad-orange`, `--grad-ink`, radii, fonts) and `lucide-react`
- [ ] Implement Hash Router (`#/`, `#/projects`, `#/projects/new`, `#/projects/:id`)
- [ ] Build Identity / Auth View (`frontend/src/pages/AuthPage.tsx`)
- [ ] Build Project Dashboard with status badges & 5-segment mini progress bar (`frontend/src/pages/ProjectListPage.tsx`)
- [ ] Build New Project Ingestion View with `.txt` dropzone + direct text paste area (`frontend/src/pages/NewProjectPage.tsx`)
- [ ] Build Project Workspace View with 5-step horizontal Stepper and sidebar (`frontend/src/pages/ProjectDetailPage.tsx`)
- [ ] Build Character Cards (3:4 ratio) & Chapter Cards (16:9 ratio) with sequential visual reveals
- [ ] Build Book Modal reader (`frontend/src/components/BookModal.tsx`) with Escape key handling
- [ ] Build Loading spinner, In-Progress captions, and Error/Retry alert banners
- [ ] Frontend component tests (`frontend/src/__tests__/`) with React Testing Library

## Phase 5: Verification, Documentation & Final Deliverables
- [ ] Execute full end-to-end user acceptance walkthrough
- [ ] Run full automated test suite (`./test.sh`) and capture raw output into `docs/TESTING.md`
- [ ] Finalize `docs/DECISIONS.md` (10 architectural decisions, 4 AI overrides, "One More Day" roadmap)
- [ ] Finalize `README.md` and documentation index
- [ ] Validate clean execution of `./start.sh` and `./test.sh` from a fresh shell
- [ ] Clean Git status check: verify `.env` and `/data/` are ignored and all source code is cleanly committed
