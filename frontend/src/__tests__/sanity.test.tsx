import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('US-0.5: Frontend Testing Harness Sanity', () => {
  it('renders DOM components inside jsdom environment', () => {
    render(<div data-testid="test-badge">Gradion Studio</div>);
    const element = screen.getByTestId('test-badge');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Gradion Studio');
  });
});
