import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

const mockApiLogin = vi.fn();
const mockApiRegister = vi.fn();
const mockApiLogout = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('../services/api', () => ({
  login: (...args) => mockApiLogin(...args),
  register: (...args) => mockApiRegister(...args),
  logout: (...args) => mockApiLogout(...args),
  getCurrentUser: (...args) => mockGetCurrentUser(...args),
  updateTheme: vi.fn(),
  updateProfile: vi.fn(),
  updateEmail: vi.fn(),
  deleteAccount: vi.fn(),
  updateViewMode: vi.fn()
}));

function TestConsumer() {
  const { user, loading, isAuthenticated, login, logout, register } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button onClick={() => login('a@b.com', 'pass')}>Login</button>
      <button onClick={() => register('new@b.com', 'pass', 'Name')}>Register</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockRejectedValue(new Error('Not authenticated'));
  });

  it('provides unauthenticated state when getCurrentUser fails', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('login updates user state on success', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockResolvedValue({
      user: { id: 1, email: 'a@b.com', name: 'User' }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockApiLogin).toHaveBeenCalledWith('a@b.com', 'pass', false);
      expect(screen.getByTestId('user')).toHaveTextContent('a@b.com');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
  });

  it('login returns success: false and error on failure', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockApiLogin).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('logout clears user state', async () => {
    const user = userEvent.setup();
    mockGetCurrentUser.mockResolvedValueOnce({ user: { id: 1, email: 'a@b.com' } });
    mockApiLogout.mockResolvedValue();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@b.com'));

    await user.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(mockApiLogout).toHaveBeenCalled();
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('register updates user state on success', async () => {
    const user = userEvent.setup();
    mockApiRegister.mockResolvedValue({
      user: { id: 2, email: 'new@b.com', name: 'Name' }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockApiRegister).toHaveBeenCalledWith('new@b.com', 'pass', 'Name', false);
      expect(screen.getByTestId('user')).toHaveTextContent('new@b.com');
    });
  });
});
