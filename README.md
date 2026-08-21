# Book Illustration Studio — Gradion Assessment

An AI-assisted book illustration studio that transforms literary manuscripts into consistent visual assets using the **Google Gemini API**.

Built with **Node.js/Express (TypeScript)**, **React + Vite (TypeScript)**, and the **Gradion Design System**.

---

## Quickstart Guide

### Prerequisites
* **Node.js**: v20+ installed
* **Google Gemini API Key**: [Get an API Key](https://aistudio.google.com/)

### 1. Single-Command Launch
```bash
# Clone the repository
git clone <repo-url>
cd gradion-software-engineer-intern-assessment

# Start the fullstack application (Backend on 3001, Frontend on 3000)
./start.sh
```
> `./start.sh` automatically checks your environment, installs workspace dependencies if needed, and starts both Express and Vite development servers concurrently.

### 2. Configure Environment
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Edit `.env` to supply your `GEMINI_API_KEY`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_TEXT_MODEL=gemini-flash-latest
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
BACKEND_PORT=3001
FRONTEND_PORT=3000
STORAGE_DIR=./data
```

### 3. Single-Command Automated Tests
```bash
# Run all backend and frontend test suites
./test.sh
```

---

## Complete Project Documentation (`/docs`)

All planning documents, decisions, user stories, and test logs are located in `/docs`:

1. **[User Stories & Acceptance Criteria](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/user-stories.md)** (`docs/user-stories.md`)
   * Comprehensive Agile backlog across all phases with formal Given-When-Then Gherkin acceptance criteria (`US-0.1` to `US-5.1`).
2. **[Architecture Decisions & AI Copilot Overrides](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/DECISIONS.md)** (`docs/DECISIONS.md`)
   * 10 architectural decisions with trade-offs, **7 explicit AI overrides** (including the Next.js/Postgres/client-side-locking/Imagen-3 rejections, replacing per-step Gemini calls with the notebook's File-API + Interactions-API chaining, and a live-discovered model-retirement fix), and "One More Day" roadmap.
3. **[Master Implementation Plan & PRD](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/plan.md)** (`docs/plan.md`)
   * 14-row architectural decision matrix, 5-step pipeline mechanics, negative prompt rules, and state machine specifications.
4. **[System Architecture](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/architecture.md)** (`docs/architecture.md`)
   * Architecture diagram, REST endpoint specifications, and TypeScript data models.
5. **[Task Tracker & Checklist](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/tasks.md)** (`docs/tasks.md`)
   * Phase-by-phase implementation checklist.
6. **[Testing Strategy & Execution Outputs](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/TESTING.md)** (`docs/TESTING.md`)
   * Testing philosophy, ordering invariants, caps enforcement, and raw test outputs.
7. **[Walkthrough & Verification Journal](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/walkthrough.md)** (`docs/walkthrough.md`)
   * Incremental verification logs across development milestones.
8. **[Native Agent Guidelines](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/AGENTS.md)** (`AGENTS.md`)
   * Antigravity operational rules, caps constraints, and logging protocols.

---

## Tech Stack Summary

* **Backend**: Node.js, Express, TypeScript, `@google/genai`, `proper-lockfile`, `uuid`, `cors`, `dotenv`
* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (Gradion Design Tokens), `lucide-react`
* **AI Models**:
  * **Text & Structure**: `gemini-flash-latest` via the Gemini Interactions API (`ai.interactions.create`, chained via `previous_interaction_id`), structured JSON output
  * **Multimodal Generation**: `gemini-2.5-flash-image` (Nano Banana family), same chained Interactions API
* **Testing**: Vitest, Supertest, React Testing Library, jsdom
* **Monorepo**: Root `npm workspaces` (`/backend`, `/frontend`, `/shared`)
