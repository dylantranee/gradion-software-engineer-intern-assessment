# Technical Architecture & System Specifications

## 1. System Overview

The **Book Illustration Studio** is structured as a decoupled client-server architecture with local disk persistence and direct integration with Google Gemini:

```
+-------------------------------------------------------------+
|                      React + Vite Frontend                  |
|  - Tailwind CSS + Gradion Design Tokens                     |
|  - Lucide Icons & Responsive Views                          |
|  - Stepper & Sequential Art Reveal Components               |
|  - HTML5 History API Router (/login, /projects, /projects/:id) |
|  - Live Status Polling & In-Progress Captions               |
+------------------------------+------------------------------+
                               | REST API
+------------------------------v------------------------------+
|                   Node.js / Express Backend                 |
|  - Authentication Controller (Passwordless x-user-email)    |
|  - Pipeline Orchestrator (Step sequencing & mutex locks)    |
|  - Storage Engine (Atomic JSON writes with proper-lockfile) |
|  - Asset Static Server (/api/projects/:id/assets/*)         |
+------------------------------+------------------------------+
                               | Official SDK / REST
+------------------------------v------------------------------+
|                      Google Gemini API                      |
|  - File API (Context caching for source book text)          |
|  - Gemini 2.5 Flash (Structured JSON extraction)            |
|  - Gemini 2.5 Flash Image (Nano Banana visual generation)   |
+-------------------------------------------------------------+
```

---

## 2. API Contract Specification

### Identity Endpoints
- `POST /api/auth/login`
  - Body: `{ name: string, email: string }`
  - Validation: Both `name` and `email` are strictly required (non-empty strings). Returns `400 Bad Request` on missing/invalid input.
  - Response: `{ user: { id: string, name: string, email: string, createdAt: number } }`
- `GET /api/auth/me`
  - Headers: `x-user-email: string`
  - Response: `{ user: { id: string, name: string, email: string, createdAt: number } }`

### Project Endpoints
- `GET /api/projects`
  - Headers: `x-user-email: string`
  - Response: `ProjectSummary[]` (strictly filtered by `userId`)
- `POST /api/projects`
  - Headers: `x-user-email: string`
  - Body: `{ title: string, bookText: string }`
  - Response: `Project`
- `GET /api/projects/:id`
  - Headers: `x-user-email: string`
  - Response: `Project` (returns `403 Forbidden` if project belongs to another user)

### Pipeline & Recovery Endpoints
- `POST /api/projects/:id/step/:stepKey`
  - Headers: `x-user-email: string`
  - Params: `stepKey: 'STYLE' | 'CHARACTERS' | 'PORTRAITS' | 'CHAPTERS' | 'ILLUSTRATIONS'`
  - Body (optional for STYLE): `{ customStyle?: string }`
  - Responses:
    - `200 OK`: Step completed with updated `Project`
    - `409 Conflict`: Step already in progress on this project
    - `400 Bad Request`: Prerequisite steps not met or invalid payload
    - `403 Forbidden`: Project belongs to a different user
    - `500 Internal Server Error`: Step failed, `stepState = 'FAILED'`, `lastError` recorded
- `POST /api/projects/:id/recover`
  - Headers: `x-user-email: string`
  - Response: `Project` with unlocked `stepState = 'IDLE'`
- `GET /api/projects/:id/assets/:filename`
  - Response: Image binary stream (`image/png`)

---

## 3. Business Rules & Authentication Specification (`BRD-AUTH-01`)

### 3.1 Scope & Objective
The `/login` gateway provides frictionless, passwordless identity verification (§5.2) to establish multi-tenant data boundaries across user projects without requiring third-party authentication infrastructure.

### 3.2 Field-Level Input Validation Matrix

| Field | Mandatory? | Validation Rule | Client-Side Error Response | Server-Side Error Response (`POST /api/auth/login`) |
| :--- | :--- | :--- | :--- | :--- |
| **`Full name`** | **Yes** | Non-empty string after trimming whitespace (`length > 0`). | Inline error under input: *"Please enter your full name."* + Red outline. | `400 Bad Request`<br>`{ "error": "Full name is required." }` |
| **`Email address`** | **Yes** | Must match RFC-5322 regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$` | Inline error under input: *"Please enter a valid email address."* + Red outline. | `400 Bad Request`<br>`{ "error": "A valid email address is required." }` |

### 3.3 Account Provisioning & Identity Lifecycle

```mermaid
flowchart TD
    Submit["User submits Name + Email"] --> Val{Valid Inputs?}
    Val -- No --> Err["Display Inline Field Error"]
    Val -- Yes --> Norm["Normalize Email (trim + toLowerCase)"]
    Norm --> Check{Email in data/users.json?}
    Check -- No --> Create["Create New User Entity (usr_uuid)<br/>Initialize Empty Projects List"]
    Check -- Yes --> Restore["Retrieve Existing User Profile<br/>Preserve Registered Name & Link Projects"]
    Create --> Persist["Save in localStorage (gradion_user_*)"]
    Restore --> Persist
    Persist --> Nav["Navigate Router to /projects"]
```

1. **Email Normalization:** All emails are trimmed and converted to lowercase before storage and lookup to prevent duplicate casing accounts (`ALICE@EXAMPLE.COM` → `alice@example.com`).
2. **First-Time User Registration:**
   * Generates a unique user ID: `usr_<uuid8>` (e.g. `usr_f19a3c19`).
   * Records creation timestamp `createdAt: Date.now()`.
   * Atomically appends entity to `/data/users.json`.
3. **Returning User Login (Project Resumption):**
   * Locates the existing profile by normalized email.
   * Preserves the durable registered account name.
   * Instantly grants access to all previously generated books, styles, character portraits, and chapter illustrations.

### 3.4 Multi-Tenant Boundary & Security Rules
1. **Project Ownership Tagging:** Every project entity is permanently stamped with the creator's `userId`.
2. **Access Control Enforcement:**
   * All API requests must send the `x-user-email: <email>` header.
   * If `x-user-email` is missing: Backend returns **`401 Unauthorized`**.
   * If User B attempts to view or run a pipeline step on User A's project ID: Backend returns **`403 Forbidden`**.

### 3.5 Session Lifecycle & Navigation State Machine

| Event / Route State | Trigger Condition | System Action | Target View |
| :--- | :--- | :--- | :--- |
| **Unauthenticated Access** | User visits `/projects`, `/projects/new`, or `/projects/:id` without stored user. | Route guard intercepts navigation. | Redirects to `/login`. |
| **Already Authenticated** | User visits `/login` while valid session exists in `localStorage`. | Route guard recognizes active session. | Redirects to `/projects`. |
| **Page Refresh (F5)** | User reloads page during project editing. | `AuthContext` reads `gradion_user_*` and verifies session via `GET /api/auth/me`. | Preserves active workspace route (`/projects/:id`). |
| **Explicit Sign Out** | User clicks "Sign Out" in Navbar. | Clears `gradion_user_*` from `localStorage`, resets `AuthContext`. | Redirects to `/login`. |

### 3.6 Persistent Storage Hierarchy (`/data`)
* **Unified Root `/data` Directory:**
  - All runtime project state, assets, and users are stored at the top-level repository root (`/data`).
  - `/data/users.json`: Registered user accounts.
  - `/data/projects/:id.json`: Individual project entity documents.
  - `/data/assets/:filename`: Binary PNG image files.
* **Concurrency & Safety:**
  - All JSON file updates are guarded by `proper-lockfile` advisory write locks and atomic `.tmp` rename swaps to prevent corruption.

---

## 4. Projects Dashboard Business Rules (`BRD-PROJ-LIST-01`)

### 4.1 Scope & Multi-Tenant Security Boundary
The `/projects` route serves as the tenant-isolated book library and studio dashboard:
* **Tenant Isolation:** All requests transmit the `x-user-email` header. The server returns strictly `{ projects: ProjectSummary[] }` where `project.userId === currentUser.id`.
* **Unauthorized Access:** If the session is unauthenticated or `GET /api/projects` returns `401`, the client immediately clears session state and redirects to `/login`.
* **Data Freshness:** Mounting the view triggers a fresh `GET /api/projects` fetch, ensuring pipeline updates (new characters, chapters, illustrations) are immediately reflected upon navigation.

### 4.2 State-Driven View Transitions & Display Rules

| State | Trigger Condition | Display Behavior | CTA Behavior |
| :--- | :--- | :--- | :--- |
| **Loading** | Initial mount / API in-flight | Centered spinner with `"Loading your library..."` on a clean card canvas, eliminating visual layout flicker. | Disabled / Hidden |
| **Error State** | `GET /api/projects` fails (5xx / network) | Inline error banner (`bg-red-50 border-red-200`) with `<AlertCircle />`. | Retry on refresh |
| **Empty State** | `projects.length === 0` | Full-width studio canvas (`w-full border-2 border-dashed`), `<BookPlus />` icon, text: *"Upload a book file or paste text to start generating artwork."* | Single center **`+ New project`** CTA (Header CTA hidden). |
| **Active Grid** | `projects.length > 0` | Responsive grid sorted by `updatedAt` descending (`b.updatedAt - a.updatedAt`). | Top-right **`+ New project`** CTA enabled. |

### 4.3 Responsive Viewport & Grid Contract
* **Desktop ($\ge 1024\text{px}$):** 3 columns (`lg:grid-cols-3 gap-6`).
* **Tablet ($768\text{px} - 1023\text{px}$):** 2 columns (`md:grid-cols-2 gap-6`).
* **Mobile ($< 768\text{px}$):** 1 column (`grid-cols-1 gap-4`).

### 4.4 Project Card Component Contract
Every card in the active grid renders:
1. **Title:** Multi-line clamped (`line-clamp-2 min-h-[3.25rem]`), bold, with hover color transition to Gradion Orange and native browser `title` tooltip on hover.
2. **Status Pill (`StatusPill`):** Standardized 3-state indicator (`Draft` \| `In progress` \| `Done` \| `Error`):
   - **`Draft`**: Rendered when `status === 'CREATED'`.
   - **`In progress`**: Rendered across steps 1–4. Displays an **animated pulsing dot** (`animate-pulse-dot`) during active API execution (`stepState === 'RUNNING'`), and a **static solid dot** when idle between steps.
   - **`Done`**: Rendered with an emerald checkmark when `status === 'DONE'`.
   - **`Error`**: Rendered in soft red when `stepState === 'FAILED'`.
   - Guarded with `whitespace-nowrap flex-shrink-0` to guarantee single-line badge rendering.
3. **5-Step Visual Progress Bar (`ProgressBar`):** Discrete 5-segment indicator representing progress across the 5 steps without redundant text labels.
4. **Contextual Metadata Footer:** Formatted update date (`MMM D, YYYY`), conditionally displaying character count (`X characters`) and chapter count (`X chapters`) only when $> 0$ (avoiding zero-count clutter).
5. **Navigation:** Single-click transitions the router to `/projects/:id` without full page reload.

---

## 5. New Project Creation Business Rules (`BRD-NEW-PROJ-01`)

### 5.1 Scope, Security & Route Guarding
* **BR-NEW-AUTH-01 (Authentication Guard):** Accessing `/projects/new` requires a valid active session (`gradion_user_*`). Unauthenticated navigation is intercepted immediately by client routing and redirected to `/login`.
* **BR-NEW-TENANT-01 (Tenant Isolation):** Submissions transmit the `x-user-email` header. The server assigns ownership to `currentUser.id`, isolating the new project from all other users.

### 5.2 Field Validation Matrix & Limits

| Field | Requirement | Validation Rule | Error Message / Edge Case |
| :--- | :--- | :--- | :--- |
| **Book Title** | Mandatory (`*`) | Non-empty string after `.trim()`. | `"Please provide a book title."` |
| **Book Text** | Mandatory (`*`) | Non-empty string after `.trim()`. | `"Please provide book text."` |
| **File Upload** | Optional helper | Plain text (`.txt`) UTF-8 only; **Max 5MB**. | `"File exceeds 5MB limit. Please upload a smaller text file."` |

### 5.3 Ingestion Channels & Client Behaviors

```mermaid
graph TD
    A[Start Project Creation] --> B1[Channel 1: Direct Paste]
    A --> B2[Channel 2: Upload .txt File]
    A --> B3[Channel 3: Try sample text]
    
    B1 --> C[User types/pastes into Book Text area]
    B2 --> D[FileReader parses .txt -> auto-fills title & text]
    B3 --> E[In-memory fill: 'Wind in the Willows' + 342 words]
    
    C --> F[Click 'Create project']
    D --> F
    E --> F
    
    F --> G[POST /api/projects]
    G --> H[Navigate to /projects/:id]
```

1. **Direct Paste / Typing:** User inputs or edits text directly in the `Book text` textarea.
2. **File Upload & Smart Titling:**
   - Drag-and-drop or file picker accepts `.txt` files up to 5MB.
   - **Active Drag-Over Feedback (`BR-NEW-DRAG-01`):** Dragging a file over the dropzone triggers an active Gradion Orange ring highlight and dynamically updates text to `"Release to upload .txt file"`.
   - HTML5 `FileReader` asynchronously extracts text and fills the textarea.
   - **Smart Auto-Title:** If the title field is empty, auto-derives a clean title from the filename (strips extension, converts separators to spaces).
3. **Demo Sample Autofill ("Try sample text"):**
   - In-memory load of bundled *The Wind in the Willows* prose and default title.
   - 100% pure client-side state mutation with **zero HTTP / API network requests**.
   - Resets `fileName` to `null` so the file dropzone remains in its default state.

### 5.4 Live Metrics & UI Layout Contract
* **Live Word Counter:** Dynamically calculates `bookText.trim().split(/\s+/).length`. Hidden when text is empty; renders live formatted metric `(X words)` when text exists.
* **1-Screen Form Layout:** Constrained to `max-w-3xl py-6 sm:py-8` with a non-resizable (`resize-none`) textarea to fit comfortably on 13"+ screens without vertical scrolling.
* **Spatial Wayfinding:** Left-aligned breadcrumb link (`← Projects`) above the card, keeping the `New project` card heading flush with the input fields below.

### 5.5 Submission Lifecycle & Server Initialization Contract

| Event | Condition | System Action | Target View |
| :--- | :--- | :--- | :--- |
| **Submit Click** | Form submitted | `loading = true`: Submit button label transitions to `"Creating..."` and disables click to prevent duplicate submissions (**BR-NEW-SUBMIT-01**). | In-flight state |
| **Submit Success** | Valid `title` + `bookText` | Dispatches `POST /api/projects`. Server provisions new record with **BR-NEW-INIT-01** default schema. | Immediately redirects to **`/projects/:id`** (**BR-NEW-NAV-01**) |
| **Submit Error** | Server 5xx / Network failure | Renders inline red alert banner with server error message. Re-enables form. | Stays on `/projects/new` |
| **Cancel / Exit** | Click `← Projects` or `Cancel` | Aborts creation; zero network requests sent. | Returns to **`/projects`** |

#### Default Entity Provisioning Schema (`BR-NEW-INIT-01`)
```typescript
{
  id: `proj_${uuid()}`,
  userId: currentUser.id,
  title: req.body.title.trim(),
  bookText: req.body.bookText.trim(),
  status: 'CREATED',
  stepState: 'IDLE',
  characters: [],
  chapters: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

---

## 6. Project Workspace Business Rules (`BRD-PROJ-DETAIL-01`)

### 6.1 Scope & Route Guard

| Rule ID | Condition | System Response |
| :--- | :--- | :--- |
| **BR-PD-AUTH-01** | User visits `/projects/:id` without a stored session. | Route guard redirects to `/login`. |
| **BR-PD-LOAD-01** | Project fetch in flight on initial mount. | Centered spinner with *"Loading Illustration Studio Workspace..."* replaces the page content until the fetch settles. |
| **BR-PD-OWNER-01** | Authenticated user requests a project owned by a different user. | Backend returns `403 Forbidden`. Frontend shows "Project not found" + "Return to Projects" link (frontend does not distinguish 403 from 404). |
| **BR-PD-404-01** | Project ID does not exist in storage. | Backend returns `404 Not Found`. Frontend shows "Project not found" + "Return to Projects" link. |
| **BR-PD-FETCH-ERR-01** | `GET /api/projects/:id` fails with a network error or non-403/404 status (e.g. `500`) on initial load. | Frontend shows a distinct "Couldn't load this project" state with the server/network error message and a **"Retry"** button (re-runs the fetch) — kept separate from the 403/404 "Project not found" state above. |

**Note (`BR-PD-STYLE-CARD-01`):** The left sidebar's "Book text" card is always rendered; the "Art style" card only renders once `project.style` is set (i.e., after the `STYLE` step completes).

---

### 6.2 5-Step Stepper Component Rules

The Stepper renders 5 milestone nodes (`Style`, `Characters`, `Portraits`, `Chapters`, `Illustrations`) connected by a continuous horizontal rail track.

| Rule ID | Condition | Badge State | Rail Segment State |
| :--- | :--- | :--- | :--- |
| **BR-PD-STEP-01** | Step is before `currentStepNum` | ✅ Done — filled orange, white checkmark | Segment after this node fills **solid orange** |
| **BR-PD-STEP-02** | Step equals `currentStepNum` | 🟠 Current — outlined orange, step number | Segment after this node shows **faint grey rail** |
| **BR-PD-STEP-03** | Step is after `currentStepNum` | ⬜ Pending — muted background, step number | Segment after this node shows **faint grey rail** |
| **BR-PD-STEP-04** | `stepState === 'RUNNING'` for this step's node | Adds an **amber pulse ring** around the active badge | — |

`currentStepNum` mapping:

| `project.status` | Current Step # |
| :--- | :---: |
| `CREATED` | 1 |
| `STYLE_SET` | 2 |
| `CHARACTERS_GENERATED` | 3 |
| `PORTRAITS_GENERATED` | 4 |
| `CHAPTERS_GENERATED` | 5 |
| `DONE` | 6 (all done) |

---

### 6.3 Step Action Command Card Rules

The action card is rendered **at the bottom of the artwork column** and disappears entirely when `project.status === 'DONE'`.

#### Step-Specific Action Panels

| Rule ID | Visible When | UI Elements |
| :--- | :--- | :--- |
| **BR-PD-ACT-01** | `nextStepKey === 'STYLE'` | Optional custom style textarea + **"Set Art Style"** button |
| **BR-PD-ACT-02** | `nextStepKey === 'CHARACTERS'` | Info copy + **"Extract Characters"** button |
| **BR-PD-ACT-03** | `nextStepKey === 'PORTRAITS'` | Info copy + **"Generate Portraits"** button |
| **BR-PD-ACT-04** | `nextStepKey === 'CHAPTERS'` | Info copy + **"Extract Chapter Scene"** button |
| **BR-PD-ACT-05** | `nextStepKey === 'ILLUSTRATIONS'` | Info copy + **"Generate Illustrations"** button |
| **BR-PD-ACT-06** | `project.status === 'DONE'` | Action card is **completely hidden** — artwork takes center stage |

#### In-Flight Loading State (`stepState === 'RUNNING'` or `executing === true`)

| Rule ID | Behavior |
| :--- | :--- |
| **BR-PD-RUN-01** | Action button immediately **disables** on click to prevent double-submission. |
| **BR-PD-RUN-02** | A centered orange spinner (`Loader2 animate-spin`) replaces the action panel. |
| **BR-PD-RUN-03** | A **Figma-style vertical sliding ticker** cycles contextual micro-progress messages every 2.8 s, sliding each new message up from below (`slideUpIn` keyframe, 1.0s spring easing). |
| **BR-PD-RUN-04** | The page **polls `GET /api/projects/:id` every 1.5 seconds** while `stepState === 'RUNNING'`. Polling stops when `stepState` transitions to `IDLE` or `FAILED`. |
| **BR-PD-RUN-05** | No Status Pill is rendered in the page header on this view. Running-step progress is conveyed solely by the Stepper (§6.2), which already indicates the active step via its own pulse ring (`BR-PD-STEP-04`); the Status Pill is exclusive to the Projects Dashboard (§4.4), where the Stepper isn't visible. |

#### Micro-Progress Message Sequences (per step)

| Step | Messages (cycling) |
| :--- | :--- |
| `STYLE` | Analyzing narrative tone and themes… → Extracting period lighting and color palette… → Synthesizing cohesive artistic directives… → Finalizing book art style… |
| `CHARACTERS` | Scanning book text for key adult characters… → Extracting physical traits, age, and clothing… → Drafting visual portrait directives… → Finalizing character profiles… |
| `PORTRAITS` | Preparing canvas and mixing palette… → Applying base contours and brushwork… → Painting character features and atmospheric lighting… → Refining delicate textures and linework… → Finalizing high-fidelity portrait… |
| `CHAPTERS` | Analyzing chapters and dramatic narrative arc… → Selecting iconic chapter scene for illustration… → Ensuring character continuity and scene setting… → Finalizing chapter scene composition… |
| `ILLUSTRATIONS` | Composing 16:9 full-bleed scenic layout… → Placing characters with consistent lighting… → Rendering environmental textures and watercolor depth… → Polishing fine artistic brushwork… → Assembling final illustrated edition… |

---

### 6.4 Artwork Card Display Rules

#### Character Cards (`CharacterEntity`)

| Rule ID | Condition | Behavior |
| :--- | :--- | :--- |
| **BR-PD-CHAR-01** | `portraitReady === false` | Renders a **3:4 aspect ratio warm linen canvas** with a large literary monogram (first initial, stripped of articles/titles) and a subtle amber inset glow when `isGenerating`. |
| **BR-PD-CHAR-02** | `portraitReady === true` | Canvas transitions to display the generated portrait image from `/api/projects/:id/assets/:characterId_portrait.png`. |
| **BR-PD-CHAR-03** | Server cap | Exactly **max 2 adult characters** are extracted and displayed (server-enforced). |
| **BR-PD-CHAR-04** | Sequential reveal | Portraits are persisted to the store individually as each completes, allowing progressive card-by-card reveal during Step 3. |
| **BR-PD-CHAR-05** | Portrait image fails to load (`onError`) despite `portraitReady === true` | Falls back to the placeholder canvas (monogram) rather than showing a broken image icon. |

#### Chapter Scene Cards (`ChapterEntity`)

| Rule ID | Condition | Behavior |
| :--- | :--- | :--- |
| **BR-PD-CHAP-01** | `illustrationReady === false` | Renders a **16:9 aspect ratio warm linen canvas** with a Roman numeral or chapter initial watermark and amber glow when `isGenerating`. |
| **BR-PD-CHAP-02** | `illustrationReady === true` | Canvas transitions to display the illustration from `/api/projects/:id/assets/:chapterId_illustration.png`. |
| **BR-PD-CHAP-03** | Server cap | Exactly **max 1 chapter scene** is extracted and displayed (server-enforced). |
| **BR-PD-CHAP-04** | Illustration image fails to load (`onError`) despite `illustrationReady === true` | Falls back to the placeholder canvas (watermark) rather than showing a broken image icon. |

---

### 6.5 Smooth Scroll Transition Rules

| Rule ID | Trigger | Scroll Behavior |
| :--- | :--- | :--- |
| **BR-PD-SCROLL-01** | `status` transitions to `CHARACTERS_GENERATED` | Smooth-scrolls to the Character Cards section (300ms delay) so newly extracted characters come into view. |
| **BR-PD-SCROLL-02** | `status` transitions to `CHAPTERS_GENERATED` | Smooth-scrolls to the Chapter Scene Card section (300ms delay). |
| **BR-PD-SCROLL-03** | `status` transitions to `DONE` | **No scroll.** User stays in place to enjoy the completed chapter illustration. |

---

### 6.6 Full Book Manuscript Modal Reader Rules

| Rule ID | Behavior |
| :--- | :--- |
| **BR-PD-MODAL-01** | A **"Read full text →"** link is always visible in the manuscript sidebar. |
| **BR-PD-MODAL-02** | Clicking it opens a full-page modal overlay displaying the complete manuscript text with the book title. |
| **BR-PD-MODAL-03** | Pressing `Escape`, clicking the **"Close"** button, or clicking the backdrop outside the dialog dismisses the modal. |

---

### 6.7 Error Boundary & Stranded Recovery Rules

| Rule ID | Condition | UI Response |
| :--- | :--- | :--- |
| **BR-PD-ERR-01** | `stepState === 'FAILED'` and `lastError` is present. | Red error banner displays the failure message with a **"Retry Step"** button that re-executes the failed step key (hidden while a step is running). |
| **BR-PD-ERR-02** | `stepState === 'RUNNING'` and `Date.now() - stepStartedAt > 60000`. | Amber warning banner alerts the user the step appears stuck, with a **"Recover Project"** button that calls `POST /api/projects/:id/recover`. |
| **BR-PD-ERR-03** | Recovery success. | `project` state updates to reset `stepState` to `IDLE`; error banner clears; action panel becomes actionable again. |

---

## 7. Data Schema Definitions

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface CharacterEntity {
  id: string;
  name: string;
  prompt: string;
  portraitPath?: string;
  portraitReady: boolean;
}

export interface ChapterEntity {
  id: string;
  name: string;
  prompt: string;
  illustrationPath?: string;
  illustrationReady: boolean;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  bookText: string;
  geminiFileUri?: string;
  createdAt: number;
  updatedAt: number;
  status: 'CREATED' | 'STYLE_SET' | 'CHARACTERS_GENERATED' | 'PORTRAITS_GENERATED' | 'CHAPTERS_GENERATED' | 'DONE';
  stepState: 'IDLE' | 'RUNNING' | 'FAILED';
  currentRunningStep?: 'STYLE' | 'CHARACTERS' | 'PORTRAITS' | 'CHAPTERS' | 'ILLUSTRATIONS';
  stepStartedAt?: number;
  lastError?: {
    step: string;
    message: string;
    timestamp: number;
  };
  style?: string;
  characters: CharacterEntity[];
  chapters: ChapterEntity[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  status: Project['status'];
  stepState: Project['stepState'];
  createdAt: number;
  updatedAt: number;
  characterCount: number;
  chapterCount: number;
}
```
