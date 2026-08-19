import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from '../components/StatusPill.js';

describe('US-4.4 & US-4.11: StatusPill Component', () => {
  it('renders Draft badge when status is CREATED', () => {
    render(<StatusPill status="CREATED" />);
    const pill = screen.getByTestId('status-pill-draft');
    expect(pill.textContent).toContain('Draft');
  });

  it('renders In Progress badge when stepState is RUNNING', () => {
    render(<StatusPill status="CREATED" stepState="RUNNING" />);
    const pill = screen.getByTestId('status-pill-running');
    expect(pill.textContent).toContain('In progress');
  });

  it('renders Error badge when stepState is FAILED', () => {
    render(<StatusPill status="CREATED" stepState="FAILED" />);
    const pill = screen.getByTestId('status-pill-failed');
    expect(pill.textContent).toContain('Error');
  });

  it('renders Done badge when status is DONE', () => {
    render(<StatusPill status="DONE" />);
    const pill = screen.getByTestId('status-pill-done');
    expect(pill.textContent).toContain('Done');
  });
});
