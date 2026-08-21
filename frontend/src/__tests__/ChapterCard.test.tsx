import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChapterCard } from '../components/ChapterCard.js';
import { ChapterEntity } from '../../../shared/types.js';

describe('BR-PD-CHAP-01, BR-PD-CHAP-02 & BR-PD-CHAP-04: ChapterCard Component', () => {
  const sampleChapter: ChapterEntity = {
    id: 'ch_1',
    name: 'Chapter 1: The River Bank',
    prompt: 'A sunlit riverbank scene with the Mole and Rat in a rowboat',
    illustrationReady: false,
  };

  it('BR-PD-CHAP-01: renders chapter name, prompt, and placeholder canvas when illustrationReady is false', () => {
    render(<ChapterCard chapter={sampleChapter} projectId="proj_1" />);

    expect(screen.getByText('Chapter 1: The River Bank')).toBeDefined();
    expect(
      screen.getByText(/A sunlit riverbank scene with the Mole and Rat/i)
    ).toBeDefined();
    expect(screen.getByTestId('chapter-canvas-placeholder-ch_1')).toBeInTheDocument();
    expect(screen.queryByTestId('chapter-illustration-ch_1')).toBeNull();
  });

  it('BR-PD-CHAP-02: renders illustration image when illustrationReady is true with correct src', () => {
    const readyChapter: ChapterEntity = {
      ...sampleChapter,
      illustrationReady: true,
    };

    render(<ChapterCard chapter={readyChapter} projectId="proj_1" />);

    const img = screen.getByTestId('chapter-illustration-ch_1') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('/api/projects/proj_1/assets/ch_1_illustration.png');
  });

  it('BR-PD-CHAP-04: falls back to the placeholder canvas when the illustration image fails to load', () => {
    const readyChapter: ChapterEntity = {
      ...sampleChapter,
      illustrationReady: true,
    };

    render(<ChapterCard chapter={readyChapter} projectId="proj_1" />);

    const img = screen.getByTestId('chapter-illustration-ch_1');
    fireEvent.error(img);

    expect(screen.queryByTestId('chapter-illustration-ch_1')).toBeNull();
    expect(screen.getByTestId('chapter-canvas-placeholder-ch_1')).toBeInTheDocument();
  });
});
