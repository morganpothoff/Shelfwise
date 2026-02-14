import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin
  })
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  function renderLoginPage() {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  }

  it('renders login form with email and password fields', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in|log in|login/i })).toBeInTheDocument();
  });

  it('renders Shelfwise title', () => {
    renderLoginPage();
    expect(screen.getByText('Shelfwise')).toBeInTheDocument();
  });

  it('calls login with email and password on submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in|log in|login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', false);
    });
  });

  it('navigates to home when login succeeds', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in|log in|login/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error when login returns success false', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in|log in|login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('sends rememberMe true when checkbox is checked', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'pass');
    await user.click(screen.getByLabelText(/remember me/i));
    await user.click(screen.getByRole('button', { name: /sign in|log in|login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'pass', true);
    });
  });
});
