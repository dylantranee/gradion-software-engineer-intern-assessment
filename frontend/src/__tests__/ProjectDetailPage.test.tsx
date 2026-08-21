import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProjectDetailPage } from '../pages/ProjectDetailPage.js';
import { RouterProvider } from '../router.js';
import { api } from '../api.js';
import { Project } from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Mock API module — mirror the full export shape
// ---------------------------------------------------------------------------
vi.mock('../api.js', () => ({
  api: {
    getProject: vi.fn(),
    executeStep: vi.fn(),
    recoverProject: vi.fn(),
    getMe: vi.fn(),
  },
  getStoredUser: vi.fn(() => ({ id: 'u1', name: 'Alice', email: 'alice@example.com', createdAt: 0 })),
  clearStoredUser: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Project fixtures
// ---------------------------------------------------------------------------
const BASE_PROJECT: Project = {
  id: 'proj_abc',
  title: 'The Wind in the Willows',
  bookText: 'The Mole had been working very hard all the morning.',
  status: 'CREATED',
  stepState: 'IDLE',
  userId: 'u1',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  characters: [],
  chapters: [],
};

function makeProject(overrides: Partial<Project>): Project {
  return { ...BASE_PROJECT, ...overrides };
}

function renderPage(projectId = 'proj_abc') {
  return render(
    <RouterProvider>
      <ProjectDetailPage projectId={projectId} />
    </RouterProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BRD-PROJ-DETAIL-01: Project Workspace (/projects/:id) Business Rules', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  // ── 6.1 Loading ─────────────────────────────────────────────────────────────
  describe('BR-PD-LOAD-01: Initial loading state', () => {
    it('shows loading state while initial fetch is in-flight', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
      renderPage();
      // Loading heading or spinner should be present
      expect(
        screen.getByText(/Loading Illustration Studio Workspace/i)
      ).toBeInTheDocument();
    });
  });

  // ── 6.1 Not-Found ───────────────────────────────────────────────────────────
  describe('BR-PD-404-01: Project not-found state', () => {
    it('shows project-not-found UI with return link when API rejects with a 404 status', async () => {
      const notFoundError = new Error('Not found') as Error & { status?: number };
      notFoundError.status = 404;
      (api.getProject as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundError);
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Return to Projects/i })).toBeInTheDocument();
      });
    });
  });

  // ── 6.1 Fetch Failure (network/5xx) ─────────────────────────────────────────
  describe('BR-PD-FETCH-ERR-01: network/5xx failure is distinct from not-found', () => {
    it('shows a retryable error state, not "Project not found", when the fetch fails without a 403/404 status', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('project-fetch-error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.queryByText('Project not found')).not.toBeInTheDocument();
      });
    });

    it('retries the fetch when the Retry button is clicked', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeProject({}));
      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('project-fetch-error')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('fetch-error-retry-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('project-fetch-error')).not.toBeInTheDocument();
      });
    });
  });

  // ── 6.1 Ownership Boundary ─────────────────────────────────────────────────
  describe('BR-PD-OWNER-01: 403 Forbidden (different owner) renders project-not-found state', () => {
    it('shows project-not-found UI when getProject rejects with a 403 status', async () => {
      const forbiddenError = new Error('Forbidden') as Error & { status?: number };
      forbiddenError.status = 403;
      (api.getProject as ReturnType<typeof vi.fn>).mockRejectedValue(forbiddenError);
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Return to Projects/i })).toBeInTheDocument();
      });
    });
  });

  // ── 6.1 Sidebar Art Style Card ─────────────────────────────────────────────
  describe('BR-PD-STYLE-CARD-01: Art style sidebar card visibility', () => {
    it('does not render the Art style card before the STYLE step completes', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({ status: 'CREATED', style: undefined })
      );
      renderPage();
      await waitFor(() => screen.getByTestId('execute-step-style'));
      expect(screen.queryByTestId('art-style-card')).toBeNull();
    });

    it('renders the Art style card with the established style text once project.style is set', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'STYLE_SET',
          style: 'Vintage storybook watercolor with delicate ink line art',
        })
      );
      renderPage();
      await waitFor(() => expect(screen.getByTestId('art-style-card')).toBeInTheDocument());
      expect(
        screen.getByText('Vintage storybook watercolor with delicate ink line art')
      ).toBeInTheDocument();
    });
  });

  // ── 6.2 Stepper Badge States ───────────────────────────────────────────────
  describe('BR-PD-STEP-01 – BR-PD-STEP-03: Stepper badge states', () => {
    it('CREATED: Step 1 current (shows "1"), Steps 2-5 pending', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'CREATED' }));
      renderPage();
      await waitFor(() => screen.getByTestId('stepper-badge-style'));
      expect(screen.getByTestId('stepper-badge-style').textContent?.trim()).toBe('1');
      expect(screen.getByTestId('stepper-badge-characters').textContent?.trim()).toBe('2');
    });

    it('CHARACTERS_GENERATED: Steps 1-2 done (SVG checkmark), Step 3 current', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CHARACTERS_GENERATED',
          characters: [{ id: 'c1', name: 'The Mole', prompt: 'A mole', portraitReady: false }],
        })
      );
      renderPage();
      await waitFor(() => screen.getByTestId('stepper-badge-style'));
      expect(screen.getByTestId('stepper-badge-style').querySelector('svg')).toBeTruthy();
      expect(screen.getByTestId('stepper-badge-characters').querySelector('svg')).toBeTruthy();
      expect(screen.getByTestId('stepper-badge-portraits').textContent?.trim()).toBe('3');
    });

    it('DONE: all 5 steps show checkmark SVGs', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'DONE' }));
      renderPage();
      await waitFor(() => screen.getByTestId('stepper-badge-style'));
      for (const key of ['style', 'characters', 'portraits', 'chapters', 'illustrations']) {
        expect(screen.getByTestId(`stepper-badge-${key}`).querySelector('svg')).toBeTruthy();
      }
    });
  });

  // ── 6.3 Step Action Card Panels ────────────────────────────────────────────
  describe('BR-PD-ACT-01: Step 1 — style input and "Generate art style" button', () => {
    it('renders style input and button at CREATED', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'CREATED' }));
      renderPage();
      await waitFor(() => screen.getByTestId('custom-style-input'));
      expect(screen.getByTestId('custom-style-input')).toBeInTheDocument();
      expect(screen.getByTestId('execute-step-style')).toBeInTheDocument();
      expect(screen.getByTestId('execute-step-style').textContent).toMatch(/Generate art style/i);
    });
  });

  describe('BR-PD-ACT-02: Step 2 — "Extract characters" button at STYLE_SET', () => {
    it('renders Extract characters button', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'STYLE_SET' }));
      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId('execute-step-characters').textContent).toMatch(/Extract characters/i)
      );
    });
  });

  describe('BR-PD-ACT-03: Step 3 — "Generate portraits" button at CHARACTERS_GENERATED', () => {
    it('renders Generate portraits button', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CHARACTERS_GENERATED',
          characters: [{ id: 'c1', name: 'Mole', prompt: 'A mole', portraitReady: false }],
        })
      );
      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId('execute-step-portraits').textContent).toMatch(/Generate portraits/i)
      );
    });
  });

  describe('BR-PD-ACT-04: Step 4 — "Extract chapter scene" button at PORTRAITS_GENERATED', () => {
    it('renders Extract chapter scene button', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({ status: 'PORTRAITS_GENERATED' })
      );
      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId('execute-step-chapters').textContent).toMatch(/Extract chapter scene/i)
      );
    });
  });

  describe('BR-PD-ACT-05: Step 5 — "Generate illustration" button at CHAPTERS_GENERATED', () => {
    it('renders Generate illustration button', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CHAPTERS_GENERATED',
          chapters: [{ id: 'ch1', name: 'Chapter 1', prompt: 'A river scene', illustrationReady: false }],
        })
      );
      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId('execute-step-illustrations').textContent).toMatch(/Generate illustration/i)
      );
    });
  });

  describe('BR-PD-ACT-06: DONE — no step action buttons rendered', () => {
    it('hides all action step buttons when status is DONE', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'DONE' }));
      renderPage();
      await waitFor(() => screen.getByTestId('stepper-badge-style'));
      expect(screen.queryByTestId('execute-step-style')).toBeNull();
      expect(screen.queryByTestId('execute-step-characters')).toBeNull();
      expect(screen.queryByTestId('execute-step-portraits')).toBeNull();
      expect(screen.queryByTestId('execute-step-chapters')).toBeNull();
      expect(screen.queryByTestId('execute-step-illustrations')).toBeNull();
    });
  });

  // ── 6.3 In-Flight State ────────────────────────────────────────────────────
  describe('BR-PD-RUN-01 & BR-PD-RUN-02: In-flight loading state', () => {
    it('shows step-running-state UI when step execution is triggered', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'CREATED' }));
      (api.executeStep as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
      renderPage();
      await waitFor(() => screen.getByTestId('execute-step-style'));
      fireEvent.click(screen.getByTestId('execute-step-style'));
      await waitFor(() =>
        expect(screen.getByTestId('step-running-state')).toBeInTheDocument()
      );
    });

    it('BR-PD-RUN-01: the action button is gone immediately after click, preventing double-submission', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'CREATED' }));
      (api.executeStep as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
      renderPage();
      await waitFor(() => screen.getByTestId('execute-step-style'));

      fireEvent.click(screen.getByTestId('execute-step-style'));

      await waitFor(() => expect(screen.queryByTestId('execute-step-style')).toBeNull());
      // A second click cannot re-trigger executeStep since the button is unmounted
      expect(api.executeStep).toHaveBeenCalledTimes(1);
    });
  });

  // ── 6.3 Status Pill Omission ───────────────────────────────────────────────
  describe('BR-PD-RUN-05: No Status Pill is rendered in the page header on this view', () => {
    it('never renders a Status Pill, whether idle, running, or failed', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CREATED',
          stepState: 'FAILED',
          lastError: { step: 'STYLE', message: 'Boom.', timestamp: 1700000000000 },
        })
      );
      renderPage();
      await waitFor(() => expect(screen.getByTestId('error-banner')).toBeInTheDocument());
      expect(screen.queryByTestId(/^status-pill-/)).toBeNull();
    });
  });

  // ── 6.3 Ticker ──────────────────────────────────────────────────────────────
  describe('BR-PD-RUN-03: Ticker cycles micro-progress messages every 2.8s while running', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('cycles through the STYLE step messages on a 2.8s interval', async () => {
      vi.useFakeTimers();
      // First call (initial mount fetch) is idle so the action button renders;
      // subsequent polls (every 1.5s, per BR-PD-RUN-04) return RUNNING so they
      // don't clobber `executing` mid-test and reset the ticker.
      (api.getProject as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(makeProject({ status: 'CREATED', stepState: 'IDLE' }))
        .mockResolvedValue(
          makeProject({
            status: 'CREATED',
            stepState: 'RUNNING',
            currentRunningStep: 'STYLE',
            stepStartedAt: Date.now(),
          })
        );
      (api.executeStep as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

      renderPage();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      fireEvent.click(screen.getByTestId('execute-step-style'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Analyzing narrative tone and themes…')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2800);
      });
      expect(screen.getByText('Extracting period lighting and color palette…')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2800);
      });
      expect(screen.getByText('Synthesizing cohesive artistic directives…')).toBeInTheDocument();
    });
  });

  // ── 6.3 Live Polling ────────────────────────────────────────────────────────
  describe('BR-PD-RUN-04: Live status polling while stepState is RUNNING', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('polls GET /api/projects/:id on an interval while RUNNING, and stops once IDLE', async () => {
      vi.useFakeTimers();
      const getProjectMock = api.getProject as ReturnType<typeof vi.fn>;
      getProjectMock
        .mockResolvedValueOnce(
          makeProject({ status: 'CREATED', stepState: 'RUNNING', stepStartedAt: Date.now() })
        )
        .mockResolvedValueOnce(
          makeProject({ status: 'CREATED', stepState: 'RUNNING', stepStartedAt: Date.now() })
        )
        .mockResolvedValueOnce(makeProject({ status: 'STYLE_SET', stepState: 'IDLE' }));

      renderPage();

      // Initial mount fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(getProjectMock).toHaveBeenCalledTimes(1);

      // First poll tick while still RUNNING
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(getProjectMock).toHaveBeenCalledTimes(2);

      // Second poll tick — response transitions stepState to IDLE
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(getProjectMock).toHaveBeenCalledTimes(3);

      // Further time passing must NOT trigger additional polls once IDLE
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(getProjectMock).toHaveBeenCalledTimes(3);
    });

    it('also stops polling once stepState transitions to FAILED', async () => {
      vi.useFakeTimers();
      const getProjectMock = api.getProject as ReturnType<typeof vi.fn>;
      getProjectMock
        .mockResolvedValueOnce(
          makeProject({ status: 'CREATED', stepState: 'RUNNING', stepStartedAt: Date.now() })
        )
        .mockResolvedValueOnce(
          makeProject({
            status: 'CREATED',
            stepState: 'FAILED',
            lastError: { step: 'STYLE', message: 'Gemini API error.', timestamp: Date.now() },
          })
        );

      renderPage();

      // Initial mount fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(getProjectMock).toHaveBeenCalledTimes(1);

      // Poll tick — response transitions stepState to FAILED
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(getProjectMock).toHaveBeenCalledTimes(2);

      // Further time passing must NOT trigger additional polls once FAILED
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(getProjectMock).toHaveBeenCalledTimes(2);
    });
  });

  // ── 6.5 Smooth Scroll Transitions ──────────────────────────────────────────
  describe('BR-PD-SCROLL-01 – BR-PD-SCROLL-03: Smooth scroll on step-completion transitions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('BR-PD-SCROLL-01: scrolls the characters section into view 300ms after CHARACTERS_GENERATED', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'STYLE_SET' }));
      (api.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CHARACTERS_GENERATED',
          characters: [{ id: 'c1', name: 'The Mole', prompt: 'A mole', portraitReady: false }],
        })
      );

      renderPage();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      fireEvent.click(screen.getByTestId('execute-step-characters'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
      });
    });

    it('BR-PD-SCROLL-02: scrolls the chapter section into view 300ms after CHAPTERS_GENERATED', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'PORTRAITS_GENERATED',
          characters: [{ id: 'c1', name: 'The Mole', prompt: 'A mole', portraitReady: true }],
        })
      );
      (api.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CHAPTERS_GENERATED',
          characters: [{ id: 'c1', name: 'The Mole', prompt: 'A mole', portraitReady: true }],
          chapters: [{ id: 'ch1', name: 'Chapter 1', prompt: 'The river bank', illustrationReady: false }],
        })
      );

      renderPage();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      fireEvent.click(screen.getByTestId('execute-step-chapters'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
      });
    });

    it('BR-PD-SCROLL-03: does not scroll when transitioning to DONE', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CHAPTERS_GENERATED',
          chapters: [{ id: 'ch1', name: 'Chapter 1', prompt: 'The river bank', illustrationReady: false }],
        })
      );
      (api.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'DONE',
          chapters: [{ id: 'ch1', name: 'Chapter 1', prompt: 'The river bank', illustrationReady: true }],
        })
      );

      renderPage();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      fireEvent.click(screen.getByTestId('execute-step-illustrations'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });
  });

  // ── 6.4 Character Cards ────────────────────────────────────────────────────
  describe('BR-PD-CHAR-01 & BR-PD-CHAR-02: Character card placeholder and portrait reveal', () => {
    it('renders placeholder canvas when portraitReady is false', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CHARACTERS_GENERATED',
          characters: [{ id: 'c1', name: 'The Mole', prompt: 'A mole in a waistcoat', portraitReady: false }],
        })
      );
      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId('character-canvas-placeholder-c1')).toBeInTheDocument()
      );
    });

    it('renders portrait img when portraitReady is true with correct src', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'PORTRAITS_GENERATED',
          characters: [{ id: 'c1', name: 'The Mole', prompt: 'A mole', portraitReady: true }],
        })
      );
      renderPage();
      await waitFor(() => {
        const img = screen.getByTestId('character-portrait-c1') as HTMLImageElement;
        expect(img).toBeInTheDocument();
        expect(img.src).toContain('/api/projects/proj_abc/assets/c1_portrait.png');
      });
    });
  });

  // ── 6.4 Chapter Cards ─────────────────────────────────────────────────────
  describe('BR-PD-CHAP-01 & BR-PD-CHAP-02: Chapter card placeholder and illustration reveal', () => {
    it('renders placeholder canvas when illustrationReady is false', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CHAPTERS_GENERATED',
          chapters: [{ id: 'ch1', name: 'Chapter 1', prompt: 'The river bank', illustrationReady: false }],
        })
      );
      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId('chapter-canvas-placeholder-ch1')).toBeInTheDocument()
      );
    });

    it('renders illustration img when illustrationReady is true with correct src', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'DONE',
          chapters: [{ id: 'ch1', name: 'Chapter 1', prompt: 'The river bank', illustrationReady: true }],
        })
      );
      renderPage();
      await waitFor(() => {
        const img = screen.getByTestId('chapter-illustration-ch1') as HTMLImageElement;
        expect(img).toBeInTheDocument();
        expect(img.src).toContain('/api/projects/proj_abc/assets/ch1_illustration.png');
      });
    });
  });

  // ── 6.6 Book Manuscript Modal ─────────────────────────────────────────────
  describe('BR-PD-MODAL-01 – BR-PD-MODAL-03: Book manuscript modal', () => {
    it('opens modal on "Read full text" click and shows book title', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'CREATED' }));
      renderPage();
      await waitFor(() => screen.getByTestId('read-full-text-btn'));
      expect(screen.queryByRole('dialog')).toBeNull();

      fireEvent.click(screen.getByTestId('read-full-text-btn'));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getByRole('dialog')).toHaveTextContent('The Wind in the Willows');
    });

    it('closes modal on Close button click', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'CREATED' }));
      renderPage();
      await waitFor(() => screen.getByTestId('read-full-text-btn'));
      fireEvent.click(screen.getByTestId('read-full-text-btn'));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('BR-PD-MODAL-03: closes modal on Escape key press', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(makeProject({ status: 'CREATED' }));
      renderPage();
      await waitFor(() => screen.getByTestId('read-full-text-btn'));
      fireEvent.click(screen.getByTestId('read-full-text-btn'));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
  });

  // ── 6.7 Error Banner & Retry ──────────────────────────────────────────────
  describe('BR-PD-ERR-01: Error banner with retry button on stepState FAILED', () => {
    it('shows error-banner and retry-step-btn with lastError message', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CREATED',
          stepState: 'FAILED',
          lastError: { step: 'STYLE', message: 'Gemini API rate limit exceeded.', timestamp: 1700000000000 },
        })
      );
      renderPage();
      await waitFor(() => expect(screen.getByTestId('error-banner')).toBeInTheDocument());
      expect(screen.getByText(/Gemini API rate limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByTestId('retry-step-btn')).toBeInTheDocument();
    });

    it('calls executeStep when retry-step-btn is clicked', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CREATED',
          stepState: 'FAILED',
          lastError: { step: 'STYLE', message: 'Temporary error.', timestamp: 1700000000000 },
        })
      );
      (api.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({ status: 'STYLE_SET', stepState: 'IDLE' })
      );
      renderPage();
      await waitFor(() => screen.getByTestId('retry-step-btn'));
      fireEvent.click(screen.getByTestId('retry-step-btn'));
      await waitFor(() =>
        expect(api.executeStep).toHaveBeenCalledWith('proj_abc', 'STYLE', '')
      );
    });

    it('BR-PD-ERR-01: hides the Retry Step button while the retried step is running', async () => {
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({
          status: 'CREATED',
          stepState: 'FAILED',
          lastError: { step: 'STYLE', message: 'Temporary error.', timestamp: 1700000000000 },
        })
      );
      (api.executeStep as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
      renderPage();
      await waitFor(() => screen.getByTestId('retry-step-btn'));

      fireEvent.click(screen.getByTestId('retry-step-btn'));

      await waitFor(() => expect(screen.queryByTestId('retry-step-btn')).toBeNull());
      expect(screen.getByTestId('step-running-state')).toBeInTheDocument();
    });
  });

  // ── 6.7 Stranded Recovery ─────────────────────────────────────────────────
  describe('BR-PD-ERR-02: Stranded recovery banner after 60s', () => {
    it('shows recover-btn when RUNNING and stepStartedAt > 60s ago', async () => {
      const strandedAt = Date.now() - 65000;
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({ status: 'CREATED', stepState: 'RUNNING', stepStartedAt: strandedAt })
      );
      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId('recover-btn')).toBeInTheDocument()
      );
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    });

    it('calls recoverProject when recover-btn is clicked', async () => {
      const strandedAt = Date.now() - 65000;
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({ status: 'CREATED', stepState: 'RUNNING', stepStartedAt: strandedAt })
      );
      (api.recoverProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({ status: 'CREATED', stepState: 'IDLE' })
      );
      renderPage();
      await waitFor(() => screen.getByTestId('recover-btn'));
      fireEvent.click(screen.getByTestId('recover-btn'));
      await waitFor(() =>
        expect(api.recoverProject).toHaveBeenCalledWith('proj_abc')
      );
    });
  });

  describe('BR-PD-ERR-03: Recovery success clears the banner and restores the action panel', () => {
    it('clears the stranded banner and re-enables the next step action after recovery resolves', async () => {
      const strandedAt = Date.now() - 65000;
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({ status: 'CREATED', stepState: 'RUNNING', stepStartedAt: strandedAt })
      );
      (api.recoverProject as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeProject({ status: 'CREATED', stepState: 'IDLE' })
      );
      renderPage();
      await waitFor(() => screen.getByTestId('recover-btn'));
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('recover-btn'));

      await waitFor(() => expect(screen.queryByTestId('error-banner')).toBeNull());
      expect(screen.getByTestId('execute-step-style')).toBeInTheDocument();
    });
  });
});
