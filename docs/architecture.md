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

## 4. Data Schema Definitions

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
