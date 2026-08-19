import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProjectListPage } from '../pages/ProjectListPage.js';
import { RouterProvider } from '../router.js';
import { api } from '../api.js';
import { ProjectSummary } from '../../../shared/types.js';

vi.mock('../api.js', () => ({
  api: {
    listProjects: vi.fn(),
  },
}));

describe('BRD-PROJ-LIST-01: Projects Dashboard Business Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially while fetching projects', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.listProjects as any).mockReturnValue(new Promise(() => {}));

    render(
      <RouterProvider>
        <ProjectListPage />
      </RouterProvider>
    );

    expect(screen.getByText('Loading your library...')).toBeInTheDocument();
  });

  it('renders empty state studio canvas when projects array is empty (BR-PROJ-EMPTY)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.listProjects as any).mockResolvedValue([]);

    render(
      <RouterProvider>
        <ProjectListPage />
      </RouterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Upload a book file or paste text to start generating artwork.')
    ).toBeInTheDocument();

    // Verify center "+ New project" CTA links to /projects/new
    const newProjectBtn = screen.getByRole('link', { name: /New project/i });
    expect(newProjectBtn).toHaveAttribute('href', '/projects/new');
  });

  it('renders active project cards with StatusPill, ProgressBar, and metadata when projects exist', async () => {
    const mockProjects: ProjectSummary[] = [
      {
        id: 'proj_1',
        title: 'Alice in Wonderland: Deluxe Edition',
        status: 'CHARACTERS_GENERATED',
        stepState: 'IDLE',
        characterCount: 2,
        chapterCount: 0,
        createdAt: 1724000000000,
        updatedAt: 1724005000000,
      },
      {
        id: 'proj_2',
        title: 'The Great Gatsby',
        status: 'CREATED',
        stepState: 'IDLE',
        characterCount: 0,
        chapterCount: 0,
        createdAt: 1723900000000,
        updatedAt: 1723900000000,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.listProjects as any).mockResolvedValue(mockProjects);

    render(
      <RouterProvider>
        <ProjectListPage />
      </RouterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice in Wonderland: Deluxe Edition')).toBeInTheDocument();
    });

    expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();

    // Verify In progress StatusPill on proj_1
    expect(screen.getByText('In progress')).toBeInTheDocument();

    // Verify Draft StatusPill on proj_2
    expect(screen.getByText('Draft')).toBeInTheDocument();

    // Verify character count rendered for proj_1
    expect(screen.getByText('2 characters')).toBeInTheDocument();

    // Verify top-right "+ New project" header CTA is visible when projects exist
    const headerLinks = screen.getAllByRole('link', { name: /New project/i });
    expect(headerLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders inline error alert when API fetch fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.listProjects as any).mockRejectedValue(new Error('Network connection failed'));

    render(
      <RouterProvider>
        <ProjectListPage />
      </RouterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    });
  });
});
