import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BooksCompleted from './BooksCompleted';
import * as api from '../services/api';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { viewMode: 'list' }, setViewMode: vi.fn() })
}));

vi.mock('../services/api');

describe('BooksCompleted', () => {
  beforeEach(() => {
    vi.mocked(api.getCompletedBooks).mockResolvedValue([
      { id: 'library_1', source: 'library', title: 'Lib Book', author: 'A' },
      { id: 'completed_2', source: 'completed', title: 'Done Book', author: 'B' }
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderBooksCompleted() {
    return render(
      <MemoryRouter>
        <BooksCompleted />
      </MemoryRouter>
    );
  }

  it('loads and displays completed books', async () => {
    renderBooksCompleted();
    await waitFor(() => {
      expect(api.getCompletedBooks).toHaveBeenCalled();
    });
    expect(screen.getByText('Lib Book')).toBeInTheDocument();
    expect(screen.getByText('Done Book')).toBeInTheDocument();
  });

  it('shows "Book marked as unread" after deleting a library book', async () => {
    vi.mocked(api.deleteCompletedBook).mockResolvedValue({ message: 'Book marked as unread' });
    renderBooksCompleted();
    await waitFor(() => {
      expect(screen.getByText('Lib Book')).toBeInTheDocument();
    });

    vi.stubGlobal('confirm', vi.fn(() => true));
    const deleteButtons = screen.getAllByTitle('Mark as unread');
    const firstDelete = deleteButtons[0];
    await userEvent.click(firstDelete);

    await waitFor(() => {
      expect(api.deleteCompletedBook).toHaveBeenCalledWith('library_1');
    });
    await waitFor(() => {
      expect(screen.getByText('Book marked as unread')).toBeInTheDocument();
    });
    vi.unstubAllGlobals();
  });

  it('shows "Book removed from completed books" after deleting a completed book', async () => {
    vi.mocked(api.deleteCompletedBook).mockResolvedValue({ message: 'Completed book deleted successfully' });
    renderBooksCompleted();
    await waitFor(() => {
      expect(screen.getByText('Done Book')).toBeInTheDocument();
    });

    vi.stubGlobal('confirm', vi.fn(() => true));
    const deleteBtn = screen.getByTitle('Remove from completed books');
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.deleteCompletedBook).toHaveBeenCalledWith('completed_2');
    });
    await waitFor(() => {
      expect(screen.getByText('Book removed from completed books')).toBeInTheDocument();
    });
    vi.unstubAllGlobals();
  });

  it('after Add to Library replaces book in list with new library book', async () => {
    const newLibraryBook = {
      id: 'library_99',
      source: 'library',
      title: 'Done Book',
      author: 'B'
    };
    vi.mocked(api.addCompletedBookToLibrary).mockResolvedValue({ book: newLibraryBook });

    renderBooksCompleted();
    await waitFor(() => {
      expect(screen.getByText('Done Book')).toBeInTheDocument();
    });

    vi.stubGlobal('confirm', vi.fn(() => true));
    const addBtn = screen.getByTitle('Add to library');
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(api.addCompletedBookToLibrary).toHaveBeenCalledWith('completed_2');
    });
    await waitFor(() => {
      expect(screen.getByText(/"Done Book" added to your library!/)).toBeInTheDocument();
    });
    vi.unstubAllGlobals();
  });

  it('displays Books Completed heading with count', async () => {
    renderBooksCompleted();
    await waitFor(() => {
      expect(screen.getByText(/Books Completed/)).toBeInTheDocument();
    });
    expect(screen.getByText(/2 books/)).toBeInTheDocument();
  });
});
