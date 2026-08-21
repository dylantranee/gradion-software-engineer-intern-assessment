# Architecture Decisions, Trade-Offs & AI Copilot Overrides

This document logs the decisions that actually shaped the **Book Illustration Studio**, and the places the AI copilot's first pass was wrong, unsafe, or overcomplicated. Kept it to the ones that mattered rather than every choice made along the way — a router library or a caption-timer detail isn't a "decision" in the sense this file is for. The push-back below runs from AI to human every time except the two I caught myself, mid-session, by testing rather than assuming — genuinely, not manufactured to check a box; the reverse case (AI catching a human mistake) just didn't happen here.

**On AI-authorship disclosure**: every commit in this repository was made with Claude Code as the AI copilot (see `CLAUDE.md`/`AGENTS.md`) — including the ones whose message doesn't say so. Per-commit disclosure (a body line, `Co-Authored-By`, etc.) wasn't applied consistently: it appeared partway through the project, then was deliberately dropped again in favor of single-line commit messages, which is this repo's house style. This paragraph is the disclosure instead of a per-commit one.

---

## Decisions

### Stack & storage: decoupled Express/Vite + local JSON, not Next.js + Postgres

Claude's first pass proposed Next.js 14's App Router so frontend and backend could live in one framework. Rejected it — Next's server actions and edge-runtime API routes introduce filesystem write instability for local JSON files, plus heavy build overhead the project doesn't need. Went with a decoupled Express backend and Vite frontend instead, tied together by a root `npm workspaces` monorepo with a `/shared` package for the TypeScript domain types both sides need identically — no package-publishing step, just a relative import.

For storage, Claude's next proposal was PostgreSQL with Prisma ORM. Rejected that too: the assessment explicitly allows disk-based storage at this scope ("JSON files on disk genuinely fit this scope, if done properly"), and a real DB would add a service a reviewer has to install and configure just to run the app locally — friction that buys nothing at this data volume. Went with local JSON files (`/data/projects/:id.json`) guarded by `proper-lockfile` advisory locks and atomic rename writes, and binary PNGs written straight to disk rather than base64-embedded in the JSON. Cost: this doesn't scale to a distributed multi-server cluster, and there's no orphaned-asset cleanup if a project is ever deleted — both accepted, out of scope here.

### Pipeline progress: separate `status` and `stepState`

Decided early, before any pipeline code existed: one enum can't express "step 3 done, step 4 currently running" — exactly the state a page refresh mid-step has to read correctly. Split it into `status` (permanent milestones, `CREATED` → `DONE`) and `stepState` (transient execution: `IDLE`/`RUNNING`/`FAILED`), with a stranded `RUNNING` lock expiring after 60 seconds and clearable via a dedicated `/recover` endpoint. Cost: one more field to keep in sync on every transition, and a stranded `stepState` needs that timeout to clear — but it's the difference between a server crash losing a user's progress and not.

### Stopping duplicate execution: server-side mutex, not a disabled button

Claude's first pass proposed relying on React state (`disabled={isLoading}`) on the action button to prevent duplicate step submissions. Rejected it — a purely client-side guard does nothing if the user opens a second tab, refreshes mid-step, or hits the API directly via curl/Postman, any of which would burn a real Gemini call. Enforced a server-side in-memory mutex (`409 Conflict` on a concurrent request) before any async I/O begins, backed by the persisted `stepState` check above so it survives a server restart too. Cost: the in-memory lock itself resets on restart, but the 60s stranded-lock recovery above covers exactly that gap.

### Gemini models: Nano Banana over Imagen, and a model that went stale mid-project

Claude's first pass proposed `imagen-3.0-generate-002` for image generation. Rejected it — the assessment and the reference cookbook specifically call for the **Nano Banana** multimodal family, not Imagen. Switched to `gemini-2.5-flash-image`, paired with `gemini-2.5-flash` for the text/structured-extraction steps (faster and more reliably JSON-schema-constrained than `1.5-pro`).

That text-model choice went stale mid-project, and I caught it myself rather than assuming it still held: manually testing a later rewrite against the real API, the first live call came back `404: This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash.` Rather than hardcode another dated snapshot, switched `GEMINI_TEXT_MODEL` to the `gemini-flash-latest` alias, which Google keeps pointed at whatever it currently recommends. Re-ran the same manual test afterward — real File API upload, real chained calls, a real portrait generated and actually looked at, not just a 200 response trusted blind.

### Cost discipline: rebuilding the Gemini client around conversation chaining, not resending the book every step

An earlier pass of the Gemini client called `generateContent` independently for each text step, re-sending a truncated copy of the book text on every STYLE/CHARACTERS/CHAPTERS call, with no File API upload and no conversation memory — directly contradicting the assessment's "send the book once and reuse it across steps" rule. Found this myself auditing the code against the brief, not because anything broke visibly.

Fetched the actual reference notebook's raw `.ipynb` and read the real cells rather than trusting a paraphrase of it — it uploads the book once via `client.files.upload()`, then chains every step off the previous one with `previous_interaction_id`, including chaining the chapter-illustration calls off the *portrait* calls so the model can see its own earlier portraits when drawing the chapter scene. Rebuilt `GeminiClient` around that (`ai.interactions.create` + `ai.files.upload`), adding three id fields to `Project` so the chain survives across separate HTTP requests and server restarts — each step just persists a string id, no in-memory chat object needed, which is what keeps it compatible with the app's stateless resumability model above. Cost: more state to keep consistent, and the mock adapter now has to fabricate plausible interaction ids to keep the same code path exercised in tests as production.

---

## "One More Day"

EPUB/PDF export — compile the manuscript, established art style, character portraits, and chapter illustration into a single downloadable illustrated eBook. It's the natural finish line for the pipeline: right now a completed project is just a page you can look at, not something you walk away with, and that's the gap between "the AI generated some assets" and "the user has a book."
