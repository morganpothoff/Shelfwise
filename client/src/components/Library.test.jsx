import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Library from './Library';

const mockGetBooks = vi.fn();
const mockDeleteBook = vi.fn();
const mockSetViewMode = vi.fn();

vi.mock('../services/api', () => ({
  getBooks: (...args) => mockGetBooks(...args),
  deleteBook: (...args) => mockDeleteBook(...args),
  scanISBN: vi.fn(),
  searchAndAddBook: vi.fn(),
  addBook: vi.fn(),
  updateBook: vi.fn(),
  resendVerificationEmail: vi.fn(),
  exportBooks: vi.fn()
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', emailVerified: true, viewMode: 'list' },
    setViewMode: mockSetViewMode
  })
}));

const sampleBooks = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', isbn: '9780441172716' },
  { id: 2, title: 'Foundation', author: 'Isaac Asimov', isbn: '9780553293357' },
  { id: 3, title: '1984', author: 'George Orwell', isbn: '9780451524935' }
];

describe('Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBooks.mockResolvedValue(sampleBooks);
  });

  function renderLibrary() {
    return render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    );
  }

  it('renders action buttons (Scan ISBN, Enter ISBN, Add Manually, Import)', async () => {
    renderLibrary();
    await waitFor(() => expect(mockGetBooks).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /scan isbn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter isbn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add manually/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import books/i })).toBeInTheDocument();
  });

  it('loads and displays books on mount', async () => {
    renderLibrary();

    await waitFor(() => expect(mockGetBooks).toHaveBeenCalled());
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('1984')).toBeInTheDocument();
  });

  it('shows search bar when books exist', async () => {
    renderLibrary();

    await waitFor(() => expect(mockGetBooks).toHaveBeenCalled());
    expect(screen.getByPlaceholderText(/search by title/i)).toBeInTheDocument();
  });

  it('filters books when searching', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await waitFor(() => expect(mockGetBooks).toHaveBeenCalled());
    const searchInput = screen.getByPlaceholderText(/search by title/i);

    await user.type(searchInput, 'Dune');
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.queryByText('Foundation')).not.toBeInTheDocument();
  });

  it('calls deleteBook and removes book when delete confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const user = userEvent.setup();
    mockDeleteBook.mockResolvedValue({});

    renderLibrary();

    await waitFor(() => expect(mockGetBooks).toHaveBeenCalled());

    const deleteButtons = screen.getAllByTitle('Remove from library');
    await user.click(deleteButtons[0]);

    await waitFor(() => expect(mockDeleteBook).toHaveBeenCalledWith(1));
    expect(screen.queryByText('Dune')).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('shows empty state when no books', async () => {
    mockGetBooks.mockResolvedValue([]);

    renderLibrary();

    await waitFor(() => expect(mockGetBooks).toHaveBeenCalled());
    expect(screen.getByText(/your library is empty/i)).toBeInTheDocument();
  });
});
