import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RouterProvider, useRouter, Link } from '../router.js';

const TestNavigationComponent: React.FC = () => {
  const { pathname, navigate } = useRouter();

  return (
    <div>
      <span data-testid="current-path">{pathname}</span>
      <Link to="/projects/new" data-testid="link-new">New Project</Link>
      <button onClick={() => navigate('/projects/proj_123')} data-testid="btn-detail">
        Go to Detail
      </button>
    </div>
  );
};

describe('US-4.2: HTML5 History API Client Router', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('provides current pathname and updates when navigate() is called', () => {
    render(
      <RouterProvider>
        <TestNavigationComponent />
      </RouterProvider>
    );

    expect(screen.getByTestId('current-path').textContent).toBe('/');

    act(() => {
      fireEvent.click(screen.getByTestId('btn-detail'));
    });

    expect(screen.getByTestId('current-path').textContent).toBe('/projects/proj_123');
    expect(window.location.pathname).toBe('/projects/proj_123');
  });

  it('intercepts Link clicks and updates browser history without full page reload', () => {
    render(
      <RouterProvider>
        <TestNavigationComponent />
      </RouterProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('link-new'));
    });

    expect(screen.getByTestId('current-path').textContent).toBe('/projects/new');
    expect(window.location.pathname).toBe('/projects/new');
  });

  it('listens to popstate events on browser back/forward navigation', () => {
    render(
      <RouterProvider>
        <TestNavigationComponent />
      </RouterProvider>
    );

    act(() => {
      window.history.pushState({}, '', '/projects');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByTestId('current-path').textContent).toBe('/projects');
  });
});
