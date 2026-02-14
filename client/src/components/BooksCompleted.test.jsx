import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BooksCompleted from './BooksCompleted';
import * as api from '../services/api';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { viewMode: 'list' }, setViewMode: vi.fn() })
}));

vi.mock('../services/api');

vi.mock('./ISBNScanner', () => ({
  default: function MockISBNScanner({ onScan, onClose }) {
    return (
      <div data-testid="isbn-scanner">
        <button type="button" onClick={() => onScan('9780134685991')}>
          Simulate scan
        </button>
        <button type="button" onClick={onClose}>Close scanner</button>
      </div>
    );
  },
}));

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

  describe('add book actions', () => {
    it('renders Scan ISBN, Enter ISBN, Add Manually, and Import Books Read buttons', async () => {
      renderBooksCompleted();
      await waitFor(() => {
        expect(screen.getByText('Lib Book')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Scan ISBN/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Enter ISBN/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Manually/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Import Books Read/i })).toBeInTheDocument();
    });

    it('Scan ISBN: lookup then confirm modal then addCompletedBook with date_finished', async () => {
      const initialBooks = [
        { id: 'library_1', source: 'library', title: 'Lib Book', author: 'A' },
        { id: 'completed_2', source: 'completed', title: 'Done Book', author: 'B' },
      ];
      const lookedUpBook = {
        isbn: '9780134685991',
        title: 'Scanned Book',
        author: 'Scanned Author',
        page_count: 100,
        genre: 'Fiction',
        synopsis: null,
        tags: [],
        series_name: null,
        series_position: null,
      };
      vi.mocked(api.lookupBookForCompletedByIsbn).mockResolvedValue({ book: lookedUpBook });
      vi.mocked(api.addCompletedBook).mockResolvedValue({ id: 'completed_3', title: 'Scanned Book' });
      vi.mocked(api.getCompletedBooks)
        .mockResolvedValueOnce(initialBooks)
        .mockResolvedValue([...initialBooks, { id: 'completed_3', source: 'completed', title: 'Scanned Book', author: 'Scanned Author' }]);

      renderBooksCompleted();
      await waitFor(() => {
        expect(screen.getByText('Lib Book')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Scan ISBN/i }));
      await userEvent.click(screen.getByRole('button', { name: /Simulate scan/i }));

      await waitFor(() => {
        expect(api.lookupBookForCompletedByIsbn).toHaveBeenCalledWith('9780134685991');
      });
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Add to Books Completed/i })).toBeInTheDocument();
        expect(screen.getByText('Scanned Book')).toBeInTheDocument();
        expect(screen.getByText(/by Scanned Author/)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Add to Books Completed/i }));

      await waitFor(() => {
        expect(api.addCompletedBook).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Scanned Book',
            author: 'Scanned Author',
            isbn: '9780134685991',
            date_finished: null,
          })
        );
      });
      await waitFor(() => {
        expect(api.getCompletedBooks).toHaveBeenCalledTimes(2);
      });
    });

    it('Enter ISBN: submit ISBN then confirm then addCompletedBook', async () => {
      const lookedUpBook = { title: 'Entered Book', author: 'Entered Author', isbn: '9780134685991' };
      vi.mocked(api.lookupBookForCompletedByIsbn).mockResolvedValue({ book: lookedUpBook });
      vi.mocked(api.addCompletedBook).mockResolvedValue({});

      renderBooksCompleted();
      await waitFor(() => {
        expect(screen.getByText('Lib Book')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Enter ISBN/i }));
      const isbnInput = screen.getByPlaceholderText(/978-0-13-468599-1/);
      await userEvent.type(isbnInput, '9780134685991');
      await userEvent.click(screen.getByRole('button', { name: /Look Up/i }));

      await waitFor(() => {
        expect(api.lookupBookForCompletedByIsbn).toHaveBeenCalledWith('9780134685991');
      });
      await waitFor(() => {
        expect(screen.getByText('Entered Book')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Add to Books Completed/i }));

      await waitFor(() => {
        expect(api.addCompletedBook).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Entered Book',
            author: 'Entered Author',
            date_finished: null,
          })
        );
      });
    });

    it('Confirm modal: optional date is sent to addCompletedBook', async () => {
      const lookedUpBook = { title: 'Date Book', author: 'Date Author', isbn: '123' };
      vi.mocked(api.lookupBookForCompletedByIsbn).mockResolvedValue({ book: lookedUpBook });
      vi.mocked(api.addCompletedBook).mockResolvedValue({});

      renderBooksCompleted();
      await waitFor(() => {
        expect(screen.getByText('Lib Book')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Enter ISBN/i }));
      await userEvent.type(screen.getByPlaceholderText(/978-0-13-468599-1/), '9780134685991');
      await userEvent.click(screen.getByRole('button', { name: /Look Up/i }));

      await waitFor(() => {
        expect(screen.getByText('Date Book')).toBeInTheDocument();
      });
      const dateInput = screen.getByLabelText(/Date finished/i);
      await userEvent.type(dateInput, '2024-05-01');
      await userEvent.click(screen.getByRole('button', { name: /Add to Books Completed/i }));

      await waitFor(() => {
        expect(api.addCompletedBook).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Date Book',
            date_finished: '2024-05-01',
          })
        );
      });
    });

    it('Confirm modal: Cancel closes without calling addCompletedBook', async () => {
      const lookedUpBook = { title: 'Cancel Book', author: 'Cancel Author' };
      vi.mocked(api.lookupBookForCompletedByIsbn).mockResolvedValue({ book: lookedUpBook });

      renderBooksCompleted();
      await waitFor(() => {
        expect(screen.getByText('Lib Book')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Enter ISBN/i }));
      await userEvent.type(screen.getByPlaceholderText(/978-0-13-468599-1/), '9780134685991');
      await userEvent.click(screen.getByRole('button', { name: /Look Up/i }));

      await waitFor(() => {
        expect(screen.getByText('Cancel Book')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(api.addCompletedBook).not.toHaveBeenCalled();
    });

    it('Add Manually: lookup by search then confirm then addCompletedBook', async () => {
      const lookedUpBook = { title: 'Manual Book', author: 'Manual Author', isbn: '999' };
      vi.mocked(api.lookupBookForCompletedBySearch).mockResolvedValue({ book: lookedUpBook });
      vi.mocked(api.addCompletedBook).mockResolvedValue({});

      renderBooksCompleted();
      await waitFor(() => {
        expect(screen.getByText('Lib Book')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Add Manually/i }));
      await userEvent.type(screen.getByPlaceholderText(/Poppy War/), 'Manual Book');
      await userEvent.type(screen.getByPlaceholderText(/R.F. Kuang/), 'Manual Author');
      await userEvent.click(screen.getByRole('button', { name: /Find & Add Book/i }));

      await waitFor(() => {
        expect(api.lookupBookForCompletedBySearch).toHaveBeenCalledWith('Manual Book', 'Manual Author', null);
      });
      await waitFor(() => {
        expect(screen.getByText('Manual Book')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('button', { name: /Add to Books Completed/i }));

      await waitFor(() => {
        expect(api.addCompletedBook).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Manual Book',
            author: 'Manual Author',
          })
        );
      });
    });

    it('Add Manually when ISBN not found: confirm modal with title/author only, addCompletedBook with minimal payload', async () => {
      const err = new Error('ISBN not found');
      err.isbnNotFound = true;
      err.title = 'No ISBN Book';
      err.author = 'No ISBN Author';
      vi.mocked(api.lookupBookForCompletedBySearch).mockRejectedValue(err);
      vi.mocked(api.addCompletedBook).mockResolvedValue({});

      renderBooksCompleted();
      await waitFor(() => {
        expect(screen.getByText('Lib Book')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Add Manually/i }));
      await userEvent.type(screen.getByPlaceholderText(/Poppy War/), 'No ISBN Book');
      await userEvent.type(screen.getByPlaceholderText(/R.F. Kuang/), 'No ISBN Author');
      await userEvent.click(screen.getByRole('button', { name: /Find & Add Book/i }));

      await waitFor(() => {
        expect(screen.getByText('No ISBN Book')).toBeInTheDocument();
        expect(screen.getByText(/by No ISBN Author/)).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('button', { name: /Add to Books Completed/i }));

      await waitFor(() => {
        expect(api.addCompletedBook).toHaveBeenCalledWith({
          title: 'No ISBN Book',
          author: 'No ISBN Author',
          date_finished: null,
        });
      });
    });

    it('Scan ISBN when not found opens manual book form with ISBN', async () => {
      const err = new Error('Book not found');
      err.notFound = true;
      err.isbn = '9780134685991';
      vi.mocked(api.lookupBookForCompletedByIsbn).mockRejectedValue(err);

      renderBooksCompleted();
      await waitFor(() => {
        expect(screen.getByText('Lib Book')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Scan ISBN/i }));
      await userEvent.click(screen.getByRole('button', { name: /Simulate scan/i }));

      await waitFor(() => {
        expect(api.lookupBookForCompletedByIsbn).toHaveBeenCalledWith('9780134685991');
      });
      await waitFor(() => {
        expect(screen.getByText(/ISBN 9780134685991 not found/)).toBeInTheDocument();
      });
    });
  });
});
