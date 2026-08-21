import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stepper, getStepStatus } from '../components/Stepper.js';

describe('US-4.6 & US-4.11: Stepper Component', () => {
  it('computes step statuses correctly across all milestones', () => {
    // CREATED -> Step 1 current, 2-5 pending
    expect(getStepStatus(1, 'CREATED')).toBe('current');
    expect(getStepStatus(2, 'CREATED')).toBe('pending');

    // STYLE_SET -> Step 1 done, Step 2 current, 3-5 pending
    expect(getStepStatus(1, 'STYLE_SET')).toBe('done');
    expect(getStepStatus(2, 'STYLE_SET')).toBe('current');
    expect(getStepStatus(3, 'STYLE_SET')).toBe('pending');

    // CHARACTERS_GENERATED -> Steps 1-2 done, Step 3 current
    expect(getStepStatus(1, 'CHARACTERS_GENERATED')).toBe('done');
    expect(getStepStatus(2, 'CHARACTERS_GENERATED')).toBe('done');
    expect(getStepStatus(3, 'CHARACTERS_GENERATED')).toBe('current');

    // DONE -> All steps done
    expect(getStepStatus(1, 'DONE')).toBe('done');
    expect(getStepStatus(5, 'DONE')).toBe('done');
  });

  it('renders all 5 step labels and badges in DOM', () => {
    render(<Stepper status="CHARACTERS_GENERATED" />);

    expect(screen.getByText('Style')).toBeDefined();
    expect(screen.getByText('Characters')).toBeDefined();
    expect(screen.getByText('Portraits')).toBeDefined();
    expect(screen.getByText('Chapters')).toBeDefined();
    expect(screen.getByText('Illustrations')).toBeDefined();

    const styleBadge = screen.getByTestId('stepper-badge-style');
    const portraitsBadge = screen.getByTestId('stepper-badge-portraits');
    const chaptersBadge = screen.getByTestId('stepper-badge-chapters');

    expect(styleBadge.className).toContain('done');
    expect(portraitsBadge.className).toContain('current');
    expect(chaptersBadge.className).toContain('pending');
  });

  it('BR-PD-STEP-04: adds an amber pulse ring to the badge of the currently running step', () => {
    render(<Stepper status="CHARACTERS_GENERATED" currentRunningStep="PORTRAITS" />);

    const portraitsBadge = screen.getByTestId('stepper-badge-portraits');
    expect(portraitsBadge.className).toContain('ring-4');
    expect(portraitsBadge.className).toContain('animate-pulse');

    // Non-running steps must not carry the pulse ring
    const styleBadge = screen.getByTestId('stepper-badge-style');
    const chaptersBadge = screen.getByTestId('stepper-badge-chapters');
    expect(styleBadge.className).not.toContain('animate-pulse');
    expect(chaptersBadge.className).not.toContain('animate-pulse');
  });
});
