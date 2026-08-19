# Senior Product Owner: Book Illustration Studio — User Stories & Acceptance Criteria (Gherkin Format)

This document records the user stories, personas, and formal BDD/Gherkin acceptance criteria (`Scenario`, `Given`, `When`, `Then`, `And`) across all development phases of the **Book Illustration Studio**.

---

## Story Backlog Matrix

| Story ID | Phase | Title | Primary Persona | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **US-0.1** | Phase 0 | Monorepo Workspace & Shared Types Scaffolding | Fullstack Developer | `P0 (Blocker)` |
| **US-0.2** | Phase 0 | Git Hygiene & API Key Security (`.gitignore` & `.env.example`) | Security / Evaluator | `P0 (Blocker)` |
| **US-0.3** | Phase 0 | Single-Command Fullstack Startup (`./start.sh`) | Take-Home Evaluator | `P0 (Blocker)` |
| **US-0.4** | Phase 0 | Unified Test Runner Script (`./test.sh`) | Evaluator / Developer | `P0 (Blocker)` |
| **US-0.5** | Phase 0 | Fast Native TypeScript Testing Harness (Vitest) | QA / Developer | `P0 (Blocker)` |
| **US-0.6** | Phase 0 | AI Copilot Rules & Architectural Governance (`AGENTS.md`) | Engineering Lead | `P1 (High)` |
| **US-1.1** | Phase 1 | Local JSON Storage Repository for Projects & Users | Fullstack Developer | `P0 (Blocker)` |
| **US-1.2** | Phase 1 | Atomic File Writes via Advisory Locks (`proper-lockfile`) | Backend Engineer | `P0 (Blocker)` |
| **US-1.3** | Phase 1 | Dual State Machine Architecture (`status` + `stepState`) | Studio User | `P0 (Blocker)` |
| **US-1.4** | Phase 1 | Server-Side Concurrency Mutex (`409 Conflict`) | Studio User / Cost | `P0 (Blocker)` |
| **US-1.5** | Phase 1 | Stranded Lock Timeout & Safe State Recovery (`/recover`) | Studio User | `P0 (Blocker)` |
| **US-1.6** | Phase 1 | Automated Storage & Concurrency Test Suite | QA Engineer | `P0 (Blocker)` |
| **US-2.1** | Phase 2 | Gemini Client SDK Configuration & Offline Mock Adapter | Backend Engineer | `P0 (Blocker)` |
| **US-2.2** | Phase 2 | Book Manuscript Ingestion & Context Reusability | Budget Guardian | `P0 (Blocker)` |
| **US-2.3** | Phase 2 | Step 1 — Art Style Generation & User Enrichment (`gemini-2.5-flash`) | Studio User | `P0 (Blocker)` |
| **US-2.4** | Phase 2 | Step 2 — Character Extraction & Strict Cap (Max 2 Adults) | Studio User / Architect | `P0 (Blocker)` |
| **US-2.5** | Phase 2 | Step 3 — Character Portrait Art Generation (`gemini-2.5-flash-image`) | Studio User | `P0 (Blocker)` |
| **US-2.6** | Phase 2 | Step 4 — Chapter Scene Extraction & Strict Cap (Max 1 Scene) | Studio User / Architect | `P0 (Blocker)` |
| **US-2.7** | Phase 2 | Step 5 — Chapter Illustration Art Generation (`gemini-2.5-flash-image`) | Studio User | `P0 (Blocker)` |
| **US-2.8** | Phase 2 | Automated Gemini Pipeline & Mock Verification Test Suite | QA Engineer | `P0 (Blocker)` |
| **US-3.1** | Phase 3 | Multi-Tenant Data Isolation (`x-user-email` Header) | Studio User | `P0 (Blocker)` |
| **US-3.2** | Phase 3 | Local Image Asset Streaming (`GET /assets/:filename`) | Frontend Client | `P0 (Blocker)` |
| **US-4.1** | Phase 4 | Gradion Design System Tokens & Responsive Stepper | Studio User | `P0 (Blocker)` |
| **US-4.2** | Phase 4 | In-Flight Optimistic UI & Live Contextual Step Captions | Studio User | `P0 (Blocker)` |
| **US-4.3** | Phase 4 | Full Book Modal Reader & Sequential Art Reveals | Studio User | `P1 (High)` |
| **US-5.1** | Phase 5 | Automated Verification & Real Test Output Capture | Evaluator / Lead | `P0 (Blocker)` |

---

## Phase 0: Project Setup & Harness

### `US-0.1: Monorepo Workspace & Shared Domain Types Scaffolding`
* **As a** Fullstack Developer,  
* **I want** a root npm workspaces monorepo structure containing `/backend`, `/frontend`, `/shared`, and `/docs` with strict TypeScript compiler options,  
* **So that** domain entities have a single source of truth and frontend/backend code remain decoupled.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Workspace structure configuration
  Given a fresh clone of the repository
  When the developer inspects "package.json" in the root directory
  Then the workspaces array must include "backend" and "frontend"
  And root scripts for "dev", "build", "test", and "start" must be defined.

Scenario: Shared domain model accessibility
  Given the "shared/types.ts" module
  When both backend and frontend import types from "shared/types.ts"
  Then the shared types "Project", "User", "CharacterEntity", "ChapterEntity", and "PipelineStatus" must resolve without compiler errors.
```

---

### `US-0.2: Git Hygiene & API Key Security (.gitignore & .env.example)`
* **As a** Security-Conscious Evaluator,  
* **I want** a `.gitignore` and sanitized `.env.example` template,  
* **So that** Google Gemini API keys, local `/data/` folders, and `node_modules` are never leaked into the Git repository.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Protecting secrets and runtime data from Git commits
  Given a newly created ".env" file containing a real Gemini API key
  And a runtime directory "./data" containing generated JSON files and image assets
  When the evaluator runs "git status"
  Then neither ".env" nor "./data" should appear as tracked or untracked files
  And the repository working tree must remain clean of secrets.

Scenario: Providing a clear environment configuration template
  Given the ".env.example" file in the root directory
  When an evaluator inspects its contents
  Then it must contain placeholder entries for "GEMINI_API_KEY", "GEMINI_TEXT_MODEL=gemini-2.5-flash", "GEMINI_IMAGE_MODEL=gemini-2.5-flash-image", "BACKEND_PORT=3001", "FRONTEND_PORT=3000", and "STORAGE_DIR=./data".
```

---

### `US-0.3: Single-Command Application Startup (./start.sh)`
* **As an** Assessment Evaluator,  
* **I want** to execute `./start.sh` in my terminal without prior manual multi-step configuration,  
* **So that** dependencies are verified/installed and both backend (port 3001) and frontend (port 3000) servers boot up concurrently in one step.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Automated dependency installation on startup
  Given a fresh repository clone where "node_modules" is not present
  When the evaluator executes "./start.sh"
  Then the script must automatically run "npm install" before launching servers
  And Express must begin listening on "http://localhost:3001"
  And Vite must begin serving the frontend on "http://localhost:3000".

Scenario: Missing environment file warning
  Given no ".env" file exists in the repository
  When the evaluator executes "./start.sh"
  Then the script must display an instructional warning guiding them to copy ".env.example" to ".env".
```

---

### `US-0.4: Unified Test Runner Script (./test.sh)`
* **As an** Evaluator / CI Pipeline,  
* **I want** to execute `./test.sh` from the repository root,  
* **So that** all backend integration test suites and frontend component test suites run across both workspaces and exit with code 0.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Executing full cross-workspace test suite
  Given the complete codebase with all unit and integration test files
  When the evaluator executes "./test.sh" in the shell
  Then backend Vitest suites must execute and pass
  And frontend Vitest suites must execute and pass
  And the script process must exit with code 0.
```

---

### `US-0.5: Fast Native TypeScript Testing Harness (Vitest)`
* **As a** Fullstack Developer,  
* **I want** a pre-configured Vitest testing framework across both backend and frontend workspaces,  
* **So that** we can practice Test-Driven Development (TDD) for step ordering invariants, mutex locks, server caps, and UI components with sub-second execution speeds.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Backend API and invariant testing with Supertest
  Given an in-memory instance of the Express backend
  When Vitest executes "backend/tests/pipeline.test.ts"
  Then it must verify step sequencing, concurrency mutex locks, and state recovery without requiring live network calls.

Scenario: Frontend DOM testing with React Testing Library
  Given a jsdom test environment with "@testing-library/react"
  When Vitest executes "frontend/src/__tests__/Stepper.test.tsx"
  Then it must verify that Stepper badges and labels render correctly across all milestone states.
```

---

### `US-0.6: AI Copilot Governance & Context Protocols (AGENTS.md)`
* **As an** Engineering Lead,  
* **I want** native Antigravity copilot guidelines and assessment rules codified in `AGENTS.md`,  
* **So that** AI pair programmers adhere strictly to core constraints (max 2 characters, max 1 chapter, single upload context caching, Gradion design system tokens) throughout the build.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: AI copilot reading workspace context rules
  Given an AI assistant initializing in the repository
  When the assistant reads "AGENTS.md"
  Then it must recognize the 2-character cap, 1-chapter cap, and dual state machine constraints as inviolable rules
  And it must log architectural trade-offs to "docs/DECISIONS.md" and test runs to "docs/TESTING.md".
```

---

## Phase 1: Storage Layer & Concurrency Engine

### `US-1.1: Local JSON Storage Repository for Projects & Users`
* **As a** Fullstack Developer,  
* **I want** a local disk storage repository (`backend/src/storage/jsonStore.ts`) that persists user identities (`data/users.json`) and individual project files (`data/projects/:id.json`),  
* **So that** all project state and user data are persisted across server restarts without requiring any external database installations (§5.2).

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Initializing storage directory structure automatically
  Given no "data" directory exists on disk
  When the "JsonStore" initializes
  Then it must automatically create "data/projects" and "data/assets" directories if missing
  And "data/users.json" must be initialized with an empty array if not present.

Scenario: Creating and retrieving a user
  Given a new user with email "alice@example.com" and name "Alice"
  When "jsonStore.getOrCreateUser('Alice', 'alice@example.com')" is invoked
  Then the user entity must be saved with a unique "id" and "createdAt" timestamp
  And a subsequent lookup with "alice@example.com" must return the identical user record.

Scenario: Creating, updating, and listing projects
  Given an authenticated user with ID "usr_1"
  When "jsonStore.createProject(usr_1, 'Wind in the Willows', 'Full book text...')" is invoked
  Then a new project file "data/projects/:id.json" must be written with status "CREATED" and stepState "IDLE"
  And "jsonStore.listProjects(usr_1)" must return project summaries filtered strictly to "usr_1".
```

---

### `US-1.2: Atomic File Writes via Advisory Locks (proper-lockfile)`
* **As a** Backend Engineer,  
* **I want** all filesystem writes to JSON files guarded by `proper-lockfile` advisory locks and atomic `.tmp` file renaming,  
* **So that** simultaneous read/write operations or server interruptions never result in corrupted, half-written, or invalid JSON files.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Thread-safe concurrent writes to project file
  Given an existing project state file "data/projects/proj_100.json"
  When two concurrent routines simultaneously call "jsonStore.updateProject('proj_100', mutatorFn)"
  Then both mutators must execute sequentially under "proper-lockfile" advisory lock
  And writes must be staged to a temporary file "data/projects/proj_100.json.tmp" before renaming
  And the final file contents must parse successfully as valid JSON without race conditions.

Scenario: Handling lock release on write completion or error
  Given a write operation acquiring a lock on "data/projects/proj_100.json"
  When the write finishes or encounters an error
  Then the advisory lock must always be released in a "finally" block
  And subsequent write operations must not remain blocked.
```

---

### `US-1.3: Dual State Machine Architecture (status + stepState)`
* **As a** Studio User,  
* **I want** the project state to decouple permanent completed pipeline milestones (`status`) from transient in-flight execution states (`stepState`),  
* **So that** if an AI step fails or the network disconnects, my already completed steps remain completely intact and my project can easily retry from where it stopped.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Milestone progression on successful step completion
  Given a project at status "CREATED" and stepState "IDLE"
  When Step 1 (Style) begins execution
  Then "stepState" must transition to "RUNNING", "currentRunningStep" must be "STYLE", and "stepStartedAt" must record the current timestamp.
  When Step 1 finishes successfully
  Then "status" must advance to "STYLE_SET", "stepState" must return to "IDLE", and "currentRunningStep" must be cleared.

Scenario: Preserving milestones on step failure
  Given a project at status "STYLE_SET" with "stepState" "RUNNING" for Step 2 (Characters)
  When Step 2 encounters an unrecoverable API error
  Then "stepState" must transition to "FAILED"
  And "lastError" must record "{ step: 'CHARACTERS', message: errorDetails, timestamp: now }"
  And "status" must remain "STYLE_SET" so prior style progress is preserved.
```

---

### `US-1.4: Server-Side Concurrency Mutex (409 Conflict)`
* **As a** Studio User / Budget Guardian,  
* **I want** the backend server to enforce an atomic synchronous in-memory mutex (`PipelineMutex`),  
* **So that** double-clicking a button, sending rapid concurrent requests, or opening the app across two browser tabs cannot trigger simultaneous Gemini API calls or inflate API costs.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Rejecting simultaneous step execution on the same project
  Given Project "proj_100" is executing Step 2 (Characters) with "stepState = RUNNING"
  When a second request arrives at "POST /api/projects/proj_100/step/CHARACTERS"
  Then the server must immediately return HTTP status 409 Conflict
  And the JSON response body must contain "{ error: 'Pipeline step is already running on this project' }"
  And no duplicate Gemini AI call must be initiated.

Scenario: Synchronous in-memory reservation before async I/O
  Given two concurrent HTTP requests arrive simultaneously for Project "proj_100"
  When the router receives the requests
  Then "activeLocks.add(projectId)" must be evaluated synchronously before any "await" or async disk lookup
  And exactly one request must acquire the lock while the other receives 409 Conflict immediately.
```

---

### `US-1.5: Stranded Lock Timeout & Safe State Recovery (/recover)`
* **As a** Studio User,  
* **I want** the system to detect when a step has been running longer than 60 seconds (`STUCK_TIMEOUT_MS`) and provide a recovery mechanism (`POST /api/projects/:id/recover`),  
* **So that** if my server restarts or the browser crashes mid-step, my project lock is safely unlocked without corrupting my project history.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Automatic timeout detection for stranded locks
  Given Project "proj_100" has "stepState = RUNNING" and "stepStartedAt" was 65 seconds ago (> 60,000ms)
  When the user queries "GET /api/projects/proj_100" or attempts to recover
  Then the system must identify the project as stranded
  And the client must be permitted to invoke recovery.

Scenario: Successful stranded lock recovery
  Given Project "proj_100" in a stranded running state with prior completed status "CHARACTERS_GENERATED"
  When the client sends "POST /api/projects/proj_100/recover"
  Then the server must release "activeLocks", reset "stepState" to "IDLE", and clear "currentRunningStep"
  And "status" must remain "CHARACTERS_GENERATED"
  And the project must be immediately eligible to execute Step 3 (Portraits).
```

---

### `US-1.6: Automated Storage & Concurrency Test Suite`
* **As a** QA Engineer,  
* **I want** comprehensive automated unit and integration tests covering `JsonStore`, atomic locks, ordering invariants, strict caps, and concurrency rejection,  
* **So that** backend correctness is provable and reproducible via `./test.sh`.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Storage repository unit test execution
  Given the Vitest test runner
  When executing "backend/tests/storage.test.ts"
  Then all test cases for user creation, project CRUD, atomic disk writes, and concurrent update race conditions must pass.

Scenario: Mutex and state machine integration test execution
  Given the Vitest test runner and in-memory Supertest server
  When executing "backend/tests/mutex_and_state.test.ts"
  Then tests verifying 409 Conflict rejection, state transitions, stranded lock timeouts, and /recover endpoint must pass with 0 failures.
```

---

## Phase 2: Gemini API Integration Layer

### `US-2.1: Gemini Client SDK Configuration & Offline Mock Adapter`
* **As a** Backend Engineer,  
* **I want** a unified Gemini client interface (`backend/src/gemini/client.ts`) that reads model configs from `.env` and supports a deterministic Mock Adapter (`backend/src/gemini/mockAdapter.ts`),  
* **So that** developers and evaluators can run full automated test suites offline with zero API quota consumption.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Initializing live Gemini client with configured models
  Given a valid ".env" configuration with "GEMINI_API_KEY", "GEMINI_TEXT_MODEL=gemini-2.5-flash", and "GEMINI_IMAGE_MODEL=gemini-2.5-flash-image"
  When the Gemini service initializes
  Then the "@google/genai" SDK client must be configured with the API key and model variables.

Scenario: Executing deterministic offline tests via Mock Adapter
  Given a test environment without an active "GEMINI_API_KEY"
  When automated pipeline tests are executed
  Then the "MockGeminiClient" must return deterministic JSON entities and valid dummy PNG image buffers without network requests.
```

---

### `US-2.2: Book Manuscript Ingestion & Context Reusability`
* **As a** Budget Guardian,  
* **I want** the uploaded manuscript text stored locally and passed efficiently to subsequent Gemini generation steps,  
* **So that** we eliminate duplicate manuscript token uploads and optimize free-tier API costs.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Reusing manuscript context across pipeline steps
  Given a project initialized with manuscript text
  When Step 1 (Style), Step 2 (Characters), or Step 4 (Chapters) is triggered
  Then the stored manuscript text from the project entity must be reused directly
  And no duplicate ingestion file operations must be performed.
```

---

### `US-2.3: Step 1 — Art Style Generation & User Enrichment (gemini-2.5-flash)`
* **As a** Studio User,  
* **I want** Step 1 to derive a rich art style from the manuscript tone or enhance my custom style prompt via `gemini-2.5-flash`,  
* **So that** the project establishes an expressive, coherent aesthetic for all subsequent visual generation.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Automatic narrative style derivation
  Given a project containing classical children's literature text and no custom user style
  When the user executes Step 1 (Style)
  Then "gemini-2.5-flash" must analyze the book's narrative tone, era, and atmosphere
  And return a descriptive art style string (e.g. "Warm vintage watercolor with delicate ink cross-hatching")
  And the project status must advance to "STYLE_SET".

Scenario: User custom style prompt enrichment
  Given a user enters custom style text "Gothic oil painting with dark moody chiaroscuro"
  When the user executes Step 1 (Style)
  Then "gemini-2.5-flash" must preserve the user's artistic intent while enriching the prompt for image generation
  And the project status must advance to "STYLE_SET".
```

---

### `US-2.4: Step 2 — Character Extraction & Strict Cap (Max 2 Adults)`
* **As a** System Architect / Studio User,  
* **I want** Step 2 to extract adult character profiles using `gemini-2.5-flash` with strict JSON schemas and enforce a hard cap of **at most 2 adult characters**,  
* **So that** the system strictly complies with assessment rubric caps (§4.1) regardless of LLM generation size.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Extracting character profiles via structured JSON schema
  Given a project with completed status "STYLE_SET"
  When the user executes Step 2 (Characters)
  Then "gemini-2.5-flash" must be invoked with the structured "CHARACTER_SCHEMA"
  And the response must contain a valid JSON array of character objects with "name" and detailed visual "prompt" (clothing, facial features, age).

Scenario: Hard server-side enforcement of maximum 2 adult characters
  Given an LLM response containing 4 character candidates
  When the server processes the Step 2 output
  Then the saved "characters" array in the project state must contain at most 2 adult character entities
  And all extra character entities beyond 2 must be truncated
  And project status must advance to "CHARACTERS_GENERATED".
```

---

### `US-2.5: Step 3 — Character Portrait Art Generation (gemini-2.5-flash-image)`
* **As a** Studio User,  
* **I want** Step 3 to render character portrait artwork using the authentic **Nano Banana** family (`gemini-2.5-flash-image`),  
* **So that** each character has a dedicated high-fidelity portrait conforming to the established art style without unwanted text, labels, or frames.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Generating portrait artwork with negative system instructions
  Given a project with 2 extracted character profiles and status "CHARACTERS_GENERATED"
  When the user executes Step 3 (Portraits)
  Then "gemini-2.5-flash-image" must be invoked sequentially for each character
  And the prompt must incorporate the character prompt, art style, and negative instructions ("no text, labels, signatures, borders, nor frames")
  And generated image buffers must be written to "data/assets/:projectId/:characterId_portrait.png"
  And each character must set "portraitReady = true"
  And project status must advance to "PORTRAITS_GENERATED".
```

---

### `US-2.6: Step 4 — Chapter Scene Extraction & Strict Cap (Max 1 Scene)`
* **As a** System Architect / Studio User,  
* **I want** Step 4 to extract key chapter scene prompts using `gemini-2.5-flash` and enforce a hard cap of **exactly 1 chapter scene**,  
* **So that** the scene incorporates established character visual traits while adhering strictly to assessment rubric constraints (§4.1).

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Extracting chapter scene with character visual continuity
  Given a project with status "PORTRAITS_GENERATED"
  When the user executes Step 4 (Chapters)
  Then "gemini-2.5-flash" must be invoked with the structured "CHAPTER_SCHEMA"
  And the prompt must reference the names and visual traits of the characters from Step 2.

Scenario: Hard server-side enforcement of maximum 1 chapter scene
  Given an LLM response containing multiple chapter scene suggestions
  When the server processes the Step 4 output
  Then the saved "chapters" array in the project state must contain exactly 1 chapter scene entity
  And project status must advance to "CHAPTERS_GENERATED".
```

---

### `US-2.7: Step 5 — Chapter Illustration Art Generation (gemini-2.5-flash-image)`
* **As a** Studio User,  
* **I want** Step 5 to render a full chapter scene illustration using `gemini-2.5-flash-image` (Nano Banana),  
* **So that** the resulting artwork captures the dramatic climax of the chapter while visually matching the characters and art style.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Generating full chapter scene illustration
  Given a project with 1 chapter scene and status "CHAPTERS_GENERATED"
  When the user executes Step 5 (Illustrations)
  Then "gemini-2.5-flash-image" must render the scene prompt combining the established art style, character descriptions, and negative instructions
  And the generated image buffer must be written to "data/assets/:projectId/:chapterId_illustration.png"
  And the chapter entity must set "illustrationReady = true"
  And project status must advance to "DONE".
```

---

### `US-2.8: Automated Gemini Pipeline & Mock Verification Test Suite`
* **As a** QA Engineer,  
* **I want** automated unit and integration tests covering the complete 5-step pipeline, cap truncations, negative prompt embedding, and error handling,  
* **So that** end-to-end pipeline mechanics are thoroughly proven and runnable via `./test.sh`.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Executing full 5-step mock pipeline test
  Given the Vitest test runner
  When executing "backend/tests/pipeline_gemini.test.ts"
  Then all 5 steps (Style, Characters, Portraits, Chapters, Illustrations) must execute in sequence
  And verify that character count is <= 2, chapter count is == 1, negative instructions are embedded, and final project status is "DONE" with 0 failures.
```

---

## Phase 3: REST API Server & Endpoints

### `US-3.1: Multi-Tenant Data Isolation (x-user-email Header)`
* **As a** Studio User,  
* **I want** my projects accessible only by my identity,  
* **So that** User B cannot view, modify, or execute pipeline steps on User A's projects.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Rejecting cross-user unauthorized project access
  Given Project "proj_123" belonging to User A ("userA@example.com")
  When User B sends a request to "GET /api/projects/proj_123" with header "x-user-email: userB@example.com"
  Then the server must respond with HTTP status 403 Forbidden
  And Project "proj_123" data must not be disclosed to User B.
```

---

### `US-3.2: Local Image Asset Streaming (GET /assets/:filename)`
* **As a** Frontend Client,  
* **I want** to stream generated PNG images directly via relative URLs,  
* **So that** standard `<img>` tags load images cleanly without requiring custom authorization headers.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Public streaming of generated project image assets
  Given a generated image file at "data/projects/proj_123/assets/char_1_portrait.png"
  When a browser sends a request to "GET /api/projects/proj_123/assets/char_1_portrait.png"
  Then the server must respond with HTTP status 200 OK
  And the "Content-Type" header must be "image/png"
  And the binary image stream must be returned.
```

---

## Phase 4: Frontend UI / UX (Gradion Design System)

### `US-4.1: Gradion Design System Tokens & Responsive Stepper`
* **As a** Studio User,  
* **I want** a polished user interface built with Gradion Design Tokens (`--grad-orange`, `--grad-ink`, typography scales) and an interactive 5-step Stepper,  
* **So that** my progress across Style, Characters, Portraits, Chapters, and Illustrations is visually clear and delightful.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Rendering Stepper visual milestone states
  Given a project at status "CHARACTERS_GENERATED"
  When the user views the Project Workspace
  Then Step 1 (Style) and Step 2 (Characters) must render with checkmark badges
  And Step 3 (Portraits) must render with an active pulsing ring badge
  And Step 4 (Chapters) and Step 5 (Illustrations) must render as pending.
```

---

### `US-4.2: In-Flight Optimistic UI & Live Contextual Step Captions`
* **As a** Studio User,  
* **I want** the action button to lock immediately upon click and display specific running captions (e.g. *"Generating character portraits..."*),  
* **So that** I understand the exact AI operations happening under the hood.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Displaying in-flight feedback during step execution
  Given a user clicks "Generate Portraits" in Step 3
  When the request is in flight
  Then the action button must immediately become disabled
  And a spinner icon must appear alongside the caption "Generating character portrait artwork…"
  And the Status Pill must display "In progress" with a pulsing orange dot.
```

---

### `US-4.3: Full Book Modal Reader & Sequential Art Reveals`
* **As a** Studio User,  
* **I want** to preview the full manuscript in an accessible modal reader and watch character portraits reveal sequentially,  
* **So that** I have full narrative context and an engaging visual experience.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Opening and closing full book modal reader
  Given the user is on the Project Workspace page
  When the user clicks "Read full text →"
  Then the full book modal must open displaying the manuscript
  And pressing the "Escape" key or clicking the "Close" button must close the modal.

Scenario: Sequential portrait reveals
  Given Step 3 (Portraits) completes image generation for 2 characters
  When the project state is refreshed
  Then each character card must render its corresponding portrait image smoothly without layout shifts.
```

---

## Phase 5: Verification & Assessment Deliverables

### `US-5.1: Automated Verification & Real Test Output Capture`
* **As an** Evaluator / Engineering Lead,  
* **I want** all automated test suites to pass via `./test.sh` with raw outputs recorded in `docs/TESTING.md`,  
* **So that** fullstack system correctness is proven and verifiable with zero quota burning.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Automated test execution and documentation capture
  Given the complete test suite across backend and frontend workspaces
  When the developer executes "./test.sh"
  Then all test suites (pipeline sequencing, mutex locking, server caps, recovery, and UI components) must pass with 0 failures
  And the unedited terminal output must be committed into "docs/TESTING.md".
```
