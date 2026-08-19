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
| **US-1.1** | Phase 1 | Atomic JSON Storage with Advisory File Locks | Fullstack Developer | `P0 (Blocker)` |
| **US-1.2** | Phase 1 | Server-Side Concurrency Mutex (`409 Conflict`) | Studio User | `P0 (Blocker)` |
| **US-1.3** | Phase 1 | Dual State Machine & Stranded Lock Recovery | Studio User | `P0 (Blocker)` |
| **US-2.1** | Phase 2 | Gemini Text & Structured JSON Extraction (`gemini-2.5-flash`) | Studio User | `P0 (Blocker)` |
| **US-2.2** | Phase 2 | Gemini Multimodal Image Generation (`gemini-2.5-flash-image`) | Studio User | `P0 (Blocker)` |
| **US-2.3** | Phase 2 | Hard Server-Side Entity Caps (Max 2 Adults, Max 1 Chapter) | System Architect | `P0 (Blocker)` |
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

### `US-1.1: Atomic JSON Storage with Advisory File Locks`
* **As a** Fullstack Developer,  
* **I want** project state persisted in JSON files (`/data/projects/:id.json`) guarded by `proper-lockfile` and temporary file renaming,  
* **So that** state updates are completely thread-safe against concurrent filesystem writes without requiring heavy database server infrastructure.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Safe atomic disk write with advisory lock
  Given an existing project state file "data/projects/proj_123.json"
  When two asynchronous routines attempt to write to "proj_123.json" concurrently
  Then each write must acquire an advisory lock via "proper-lockfile"
  And writes must occur via a ".tmp" file atomic rename
  And the final file contents must remain uncorrupted valid JSON.
```

---

### `US-1.2: Server-Side Concurrency Mutex (409 Conflict)`
* **As a** Studio User,  
* **I want** duplicate step execution requests blocked at the server level,  
* **So that** double-clicking an action button, triggering rapid API calls, or having the app open in two browser tabs never initiates duplicate Gemini requests or inflates API costs.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Rejecting simultaneous step trigger on the same project
  Given Project "proj_123" is currently executing Step 2 ("stepState" is "RUNNING")
  When a second request arrives at "POST /api/projects/proj_123/step/CHARACTERS"
  Then the server must immediately return HTTP status 409 Conflict
  And the response body must indicate that a step is already in progress
  And no secondary Gemini API call must be initiated.
```

---

### `US-1.3: Dual State Machine & Stranded Lock Recovery`
* **As a** Studio User,  
* **I want** transient step execution (`stepState: IDLE | RUNNING | FAILED`) decoupled from permanent milestones (`status`),  
* **So that** if a step is interrupted by a browser refresh or server restart, my completed milestones remain safe and I can easily recover the project lock.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Recovering a stranded lock after timeout
  Given Project "proj_123" has been in "RUNNING" state for longer than 60,000ms ("STUCK_TIMEOUT_MS")
  When the client calls "POST /api/projects/proj_123/recover"
  Then the server must release the lock and set "stepState" to "IDLE"
  And all previously completed milestones in "status" must be preserved intact.
```

---

## Phase 2: Gemini API Integration Layer

### `US-2.1: Gemini Text & Structured JSON Extraction (gemini-2.5-flash)`
* **As a** Studio User,  
* **I want** the system to analyze my book manuscript and extract consistent art styles, adult character portfolios, and chapter prompts via `gemini-2.5-flash`,  
* **So that** entity data conforms to strict JSON schemas with sub-second response times.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Extracting structured characters with JSON Schema
  Given a project with book text and an established art style
  When the user executes Step 2 (Characters)
  Then "gemini-2.5-flash" must be invoked with the structured "CHARACTER_SCHEMA"
  And the output must be a valid JSON array containing character objects with "name" and "prompt".

Scenario: User custom art style enrichment
  Given a project with book text and user-provided custom style text "Classic watercolor"
  When the user executes Step 1 (Style)
  Then "gemini-2.5-flash" must enrich and format the style string while preserving the user's intent.
```

---

### `US-2.2: Gemini Multimodal Image Generation (gemini-2.5-flash-image)`
* **As a** Studio User,  
* **I want** character portraits (Step 3) and chapter scene illustrations (Step 5) rendered using the **Nano Banana** image family (`gemini-2.5-flash-image`),  
* **So that** the visual artwork reflects the book's defined style while maintaining character visual consistency.

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Generating portrait artwork with negative system instructions
  Given an extracted character prompt and established art style
  When Step 3 (Portraits) is triggered
  Then "gemini-2.5-flash-image" must be called with negative instructions ("no text, labels, signatures, nor borders")
  And the resulting image buffer must be written to "data/projects/:id/assets/:characterId_portrait.png"
  And the character entity must update "portraitReady" to true.
```

---

### `US-2.3: Hard Server-Side Entity Caps (Max 2 Adults, Max 1 Chapter)`
* **As a** System Architect,  
* **I want** the server to strictly limit entity counts regardless of LLM generation size,  
* **So that** Step 2 outputs exactly/max 2 adult characters and Step 4 outputs exactly/max 1 chapter scene per assessment rules (§4.1).

#### Acceptance Criteria (Gherkin)

```gherkin
Scenario: Enforcing maximum 2 adult characters
  Given an LLM response containing character data
  When the backend processes Step 2 results
  Then the saved "characters" array must contain at most 2 adult character entities
  And any additional characters beyond 2 must be rejected or truncated.

Scenario: Enforcing maximum 1 chapter scene
  Given an LLM response containing chapter scene data
  When the backend processes Step 4 results
  Then the saved "chapters" array must contain exactly 1 chapter scene entity.
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
