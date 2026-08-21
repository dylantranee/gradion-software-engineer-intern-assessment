import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('US-0.5: Frontend Testing Harness Sanity', () => {
  it('renders DOM components inside jsdom environment', () => {
    render(<div data-testid="sanity-div">Studio UI Ready</div>);
    const el = screen.getByTestId('sanity-div');
    expect(el).toBeDefined();
    expect(el.textContent).toBe('Studio UI Ready');
  });
});
