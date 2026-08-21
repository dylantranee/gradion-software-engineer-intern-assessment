import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from '../App.js';
import { api, getStoredUser, clearStoredUser } from '../api.js';
import { Project, User } from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Mock API module — mirror the full export shape
// ---------------------------------------------------------------------------
vi.mock('../api.js', () => ({
  api: {
    getMe: vi.fn(),
    login: vi.fn(),
    listProjects: vi.fn().mockResolvedValue([]),
    getProject: vi.fn(),
    createProject: vi.fn(),
    executeStep: vi.fn(),
    recoverProject: vi.fn(),
  },
  getStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
  setStoredUser: vi.fn(),
  getStoredUserEmail: vi.fn(() => ''),
}));

const STORED_USER: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', createdAt: 0 };

describe('§3.5 Session Lifecycle & Navigation State Machine', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  describe('BR-PD-AUTH-01: Unauthenticated access', () => {
    it('redirects to /login when visiting /projects/:id without a stored session', async () => {
      (getStoredUser as ReturnType<typeof vi.fn>).mockReturnValue(null);
      window.history.pushState({}, '', '/projects/proj_abc');

      render(<App />);

      await waitFor(() => {
        expect(window.location.pathname).toBe('/login');
      });
      // AuthPage's login form, not the workspace, is what actually renders
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });
  });

  describe('Already Authenticated: visiting /login with a valid session redirects to /projects', () => {
    it('redirects to /projects when visiting /login while already authenticated', async () => {
      (getStoredUser as ReturnType<typeof vi.fn>).mockReturnValue(STORED_USER);
      (api.getMe as ReturnType<typeof vi.fn>).mockResolvedValue({ user: STORED_USER });
      window.history.pushState({}, '', '/login');

      render(<App />);

      await waitFor(() => {
        expect(window.location.pathname).toBe('/projects');
      });
      // Navbar (authenticated-only) renders instead of the login form
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/full name/i)).toBeNull();
    });
  });

  describe('Page Refresh: session persists and preserves the active workspace route', () => {
    it('stays on /projects/:id after GET /api/auth/me confirms the stored session', async () => {
      const project: Project = {
        id: 'proj_abc',
        userId: 'u1',
        title: 'The Wind in the Willows',
        bookText: 'The Mole had been working very hard all the morning.',
        status: 'CREATED',
        stepState: 'IDLE',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        characters: [],
        chapters: [],
      };
      (getStoredUser as ReturnType<typeof vi.fn>).mockReturnValue(STORED_USER);
      (api.getMe as ReturnType<typeof vi.fn>).mockResolvedValue({ user: STORED_USER });
      (api.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(project);
      window.history.pushState({}, '', '/projects/proj_abc');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('The Wind in the Willows')).toBeInTheDocument();
      });
      // Route guard must not have redirected away from the workspace
      expect(window.location.pathname).toBe('/projects/proj_abc');
    });
  });

  describe('Explicit Sign Out: clicking "Sign out" clears the session and redirects to /login', () => {
    it('clears the stored session and navigates to /login on sign-out', async () => {
      (getStoredUser as ReturnType<typeof vi.fn>).mockReturnValue(STORED_USER);
      (api.getMe as ReturnType<typeof vi.fn>).mockResolvedValue({ user: STORED_USER });
      window.history.pushState({}, '', '/projects');

      render(<App />);
      const signOutBtn = await screen.findByRole('button', { name: /sign out/i });

      fireEvent.click(signOutBtn);

      await waitFor(() => {
        expect(window.location.pathname).toBe('/login');
      });
      expect(clearStoredUser).toHaveBeenCalled();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });
  });
});
