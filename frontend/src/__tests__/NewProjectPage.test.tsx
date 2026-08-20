import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewProjectPage } from '../pages/NewProjectPage.js';
import { RouterProvider } from '../router.js';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    createProject: vi.fn(),
  },
}));

describe('US-4.3: NewProjectPage Book Creation & Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, compact dropzone, and textarea', () => {
    render(
      <RouterProvider>
        <NewProjectPage />
      </RouterProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'New project' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. The Wind in the Willows')).toBeInTheDocument();
    expect(screen.getByText(/Upload book file \(\.txt\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste a chapter or story text to begin...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create project' })).toBeInTheDocument();
  });

  it('populates fields when "Try sample text" is clicked', () => {
    render(
      <RouterProvider>
        <NewProjectPage />
      </RouterProvider>
    );

    const loadSampleBtn = screen.getByRole('button', { name: /Try sample text/i });
    fireEvent.click(loadSampleBtn);

    const titleInput = screen.getByPlaceholderText('e.g. The Wind in the Willows') as HTMLInputElement;
    const textArea = screen.getByPlaceholderText('Paste a chapter or story text to begin...') as HTMLTextAreaElement;

    expect(titleInput.value).toBe('The Wind in the Willows');
    expect(textArea.value).toContain('The Mole had been working very hard');
    expect(screen.getByText(/words/i)).toBeInTheDocument();
  });

  it('submits form successfully and calls api.createProject', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.createProject as any).mockResolvedValue({
      id: 'proj_new_123',
      title: 'Alice in Wonderland',
      status: 'CREATED',
    });

    render(
      <RouterProvider>
        <NewProjectPage />
      </RouterProvider>
    );

    const titleInput = screen.getByPlaceholderText('e.g. The Wind in the Willows');
    const textArea = screen.getByPlaceholderText('Paste a chapter or story text to begin...');
    const submitBtn = screen.getByRole('button', { name: 'Create project' });

    fireEvent.change(titleInput, { target: { value: 'Alice in Wonderland' } });
    fireEvent.change(textArea, { target: { value: 'Alice was beginning to get very tired...' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createProject).toHaveBeenCalledWith(
        'Alice in Wonderland',
        'Alice was beginning to get very tired...'
      );
    });
  });

  it('BR-NEW-VAL-01: displays validation errors when fields are empty and prevents API submission', async () => {
    render(
      <RouterProvider>
        <NewProjectPage />
      </RouterProvider>
    );

    const submitBtn = screen.getByRole('button', { name: 'Create project' });

    // Submit with empty title
    fireEvent.click(submitBtn);
    expect(screen.getByText('Please provide a book title.')).toBeInTheDocument();
    expect(api.createProject).not.toHaveBeenCalled();

    // Fill title but leave book text empty
    const titleInput = screen.getByPlaceholderText('e.g. The Wind in the Willows');
    fireEvent.change(titleInput, { target: { value: 'Alice in Wonderland' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Please provide book text.')).toBeInTheDocument();
    expect(api.createProject).not.toHaveBeenCalled();
  });

  it('BR-NEW-FILE-01: rejects files exceeding 5MB limit with friendly error banner', () => {
    render(
      <RouterProvider>
        <NewProjectPage />
      </RouterProvider>
    );

    const largeFile = new File(['a'.repeat(100)], 'huge_novel.txt', { type: 'text/plain' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB

    const dropzone = screen.getByText(/Drop .txt file here or click to browse/i).closest('div')!;
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [largeFile],
      },
    });

    expect(
      screen.getByText('File exceeds 5MB limit. Please upload a smaller text file.')
    ).toBeInTheDocument();
  });

  it('BR-NEW-SUBMIT-01: transitions submit button to disabled "Creating..." during in-flight submission', async () => {
    let resolveApi: (val: unknown) => void;
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.createProject as any).mockReturnValue(apiPromise);

    render(
      <RouterProvider>
        <NewProjectPage />
      </RouterProvider>
    );

    const titleInput = screen.getByPlaceholderText('e.g. The Wind in the Willows');
    const textArea = screen.getByPlaceholderText('Paste a chapter or story text to begin...');
    const submitBtn = screen.getByRole('button', { name: 'Create project' });

    fireEvent.change(titleInput, { target: { value: 'Alice in Wonderland' } });
    fireEvent.change(textArea, { target: { value: 'Alice was beginning to get very tired...' } });
    fireEvent.click(submitBtn);

    // Assert button is disabled and shows "Creating..."
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();

    // Resolve API call
    resolveApi!({ id: 'proj_new_123', title: 'Alice in Wonderland', status: 'CREATED' });
  });

  it('BR-NEW-DRAG-01: highlights dropzone and updates text to "Release to upload .txt file" during drag-over', () => {
    render(
      <RouterProvider>
        <NewProjectPage />
      </RouterProvider>
    );

    const dropzone = screen.getByText(/Drop .txt file here or click to browse/i).closest('div')!;

    // Drag enter
    fireEvent.dragEnter(dropzone);
    expect(screen.getByText('Release to upload .txt file')).toBeInTheDocument();

    // Drag leave
    fireEvent.dragLeave(dropzone);
    expect(screen.getByText('Drop .txt file here or click to browse')).toBeInTheDocument();
  });
});
