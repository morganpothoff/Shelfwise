import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import BookProfile from './BookProfile';

const mockGetBook = vi.fn();
const mockGetBookRating = vi.fn();
const mockSaveBookRating = vi.fn();
const mockDeleteBook = vi.fn();
const mockUpdateBook = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('../services/api', () => ({
  getBook: (...args) => mockGetBook(...args),
  getBookRating: (...args) => mockGetBookRating(...args),
  saveBookRating: (...args) => mockSaveBookRating(...args),
  deleteBookRating: vi.fn(),
  deleteBook: (...args) => mockDeleteBook(...args),
  updateBook: (...args) => mockUpdateBook(...args),
  getCurrentUser: (...args) => mockGetCurrentUser(...args)
}));

const sampleBook = {
  id: 1,
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: '9780441172716',
  synopsis: 'A science fiction classic.',
  reading_status: 'unread',
  page_count: 688
};

describe('BookProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBook.mockResolvedValue(sampleBook);
    mockGetBookRating.mockRejectedValue(new Error('Not found'));
    mockGetCurrentUser.mockRejectedValue(new Error('Not authenticated'));
  });

  function renderBookProfile(bookId = '1') {
    return render(
      <MemoryRouter initialEntries={[`/book/${bookId}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/book/:id" element={<BookProfile />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('loads and displays book details', async () => {
    renderBookProfile();

    await waitFor(() => expect(mockGetBook).toHaveBeenCalledWith('1'));
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText(/Frank Herbert/)).toBeInTheDocument();
  });

  it('shows synopsis when present', async () => {
    renderBookProfile();

    await waitFor(() => expect(mockGetBook).toHaveBeenCalled());
    expect(screen.getByText(/A science fiction classic/)).toBeInTheDocument();
  });

  it('shows page count when present', async () => {
    renderBookProfile();

    await waitFor(() => expect(mockGetBook).toHaveBeenCalled());
    expect(screen.getByText('688')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('shows error when book fails to load', async () => {
    mockGetBook.mockRejectedValue(new Error('Not found'));

    renderBookProfile();

    await waitFor(() => expect(mockGetBook).toHaveBeenCalled());
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });
});
