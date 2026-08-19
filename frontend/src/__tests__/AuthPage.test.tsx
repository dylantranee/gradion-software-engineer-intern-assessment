import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthPage } from '../pages/AuthPage.js';
import { AuthProvider } from '../context/AuthContext.js';
import { RouterProvider } from '../router.js';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    login: vi.fn(),
    getMe: vi.fn().mockRejectedValue(new Error('No session')),
  },
  getStoredUser: vi.fn().mockReturnValue(null),
  getStoredUserEmail: vi.fn().mockReturnValue(''),
  setStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
}));

describe('BRD-AUTH-01: AuthPage Client-Side Validation & Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays validation errors when fields are empty and prevents API submission', async () => {
    render(
      <RouterProvider>
        <AuthProvider>
          <AuthPage />
        </AuthProvider>
      </RouterProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Please enter your full name.')).toBeInTheDocument();
    expect(await screen.findByText('Please enter your email address.')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('displays validation error for malformed email address', async () => {
    render(
      <RouterProvider>
        <AuthProvider>
          <AuthPage />
        </AuthProvider>
      </RouterProvider>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const submitBtn = screen.getByRole('button', { name: /continue/i });

    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email-format' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.queryByText('Please enter your full name.')).not.toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('submits valid name and email and triggers authentication login', async () => {
    const mockUser = {
      id: 'usr_test123',
      name: 'Jane Doe',
      email: 'jane@example.com',
      createdAt: Date.now(),
    };
    (api.login as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: mockUser });

    render(
      <RouterProvider>
        <AuthProvider>
          <AuthPage />
        </AuthProvider>
      </RouterProvider>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const submitBtn = screen.getByRole('button', { name: /continue/i });

    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('Jane Doe', 'jane@example.com');
    });
  });
});
