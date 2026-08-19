# Book Illustration Studio

> Full-stack AI application transforming literary texts into consistent visual art styles, character portraits, and chapter illustrations using the **Google Gemini API**.

---

## ⚡ Quickstart

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key (`GEMINI_API_KEY`)

```bash
# 1. Clone & setup environment
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY

# 2. Start the full application (Single Command)
./start.sh

# 3. Run all automated tests (Single Command)
./test.sh
```

---

## 📚 Project Documentation Index (`/docs`)

All design notes, test strategies, and architectural decisions are organized in [`/docs`](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/):

1. **[Architectural Decisions & AI Overrides (`docs/DECISIONS.md`)](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/DECISIONS.md)**: 
   - 10 key architectural decisions with trade-offs.
   - **4 explicit AI overrides** where AI suggestions were rejected for being incorrect, unsafe, or misaligned with spec constraints.
   - "If you had one more day" roadmap vision.
2. **[Testing Strategy & Live Test Reports (`docs/TESTING.md`)](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/TESTING.md)**:
   - Backend invariant & concurrency testing philosophy.
   - Frontend state testing philosophy.
   - Real, untruncated output from `./test.sh`.
3. **[Master Implementation Plan (`docs/plan.md`)](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/plan.md)**:
   - Comprehensive PRD, 5-step pipeline specs, and resilience model.
4. **[System Architecture (`docs/architecture.md`)](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/architecture.md)**:
   - API endpoints, data models, state machine, and component diagrams.
5. **[Active Task Tracker (`docs/tasks.md`)](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/tasks.md)**:
   - Development checklist across all phases.
6. **[Walkthrough & Verification Journal (`docs/walkthrough.md`)](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/walkthrough.md)**:
   - Milestone progress, manual verification flows, and UI demonstrations.
7. **[Assessment Specification (`docs/gradion-assessment-intern-software-engineer.md`)](file:///Users/dylantran/Documents/dev/gradion-software-engineer-intern-assessment/docs/gradion-assessment-intern-software-engineer.md)**:
   - Original assignment brief.

---

## 🛠️ Tech Stack & Key Decisions

- **Frontend**: React + Vite (TypeScript) + Tailwind CSS with Gradion Design Tokens (`--grad-orange`, `--grad-ink`) + `lucide-react` icons.
- **Backend**: Node.js + Express (TypeScript) with REST endpoints.
- **Storage**: Local JSON persistence with advisory file locking (`proper-lockfile`) for atomic concurrency control without external database daemons.
- **Asset Storage**: Local filesystem (`/data/projects/:id/assets/`) streamed directly via Express `GET /api/projects/:id/assets/:filename`.
- **AI Integration**: Official `@google/genai` SDK using `gemini-2.5-flash` for structured JSON extraction and `gemini-2.5-flash-image` (**Nano Banana** family) for visual generation.
- **Resilience Engine**: Dual state machine (`status` + `stepState`), server-side mutex lock (`409 Conflict`), and stranded lock recovery (`STUCK_TIMEOUT_MS = 60s`).
