import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Navbar from './Navbar';

describe('Navbar', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // getCurrentUser will be called by AuthProvider - make it fail so user is null
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Not authenticated' }),
      headers: new Map()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals?.();
  });

  function renderNavbar(path = '/') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('renders Shelfwise logo', async () => {
    renderNavbar();
    expect(await screen.findByText('Shelfwise')).toBeInTheDocument();
  });

  it('shows link to login when not authenticated', async () => {
    renderNavbar();
    const logoLink = await screen.findByRole('link', { name: /shelfwise/i });
    expect(logoLink).toHaveAttribute('href', '/login');
  });

  it('shows FAQ link which does not require auth', async () => {
    renderNavbar();
    expect(await screen.findByRole('link', { name: /faq/i })).toBeInTheDocument();
  });
});
