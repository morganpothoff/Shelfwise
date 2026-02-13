import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CompletedBookProfile from './CompletedBookProfile';
import * as api from '../services/api';

vi.mock('../services/api');
vi.mock('./Navbar', () => ({ default: () => React.createElement('nav', { 'data-testid': 'navbar' }, 'Nav') }));

describe('CompletedBookProfile', () => {
  const libraryBook = {
    id: 'library_5',
    source: 'library',
    title: 'Library Book',
    author: 'Author',
    owned: 1,
    date_finished: '2024-01-01'
  };

  const completedBook = {
    id: 'completed_3',
    source: 'completed',
    title: 'Completed Book',
    author: 'Author',
    owned: 0,
    date_finished: '2024-02-01'
  };

  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.mocked(api.getCompletedBook).mockImplementation((id) => {
      if (id.startsWith('library_')) return Promise.resolve({ ...libraryBook, id });
      return Promise.resolve({ ...completedBook, id });
    });
    vi.mocked(api.getCompletedBookRating).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function renderProfile(initialPath = '/completed-book/library_5') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/completed-book/:id" element={<CompletedBookProfile />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('shows "In Library" status for library source book', async () => {
    renderProfile('/completed-book/library_5');
    await waitFor(() => {
      expect(screen.getByText('Library Book')).toBeInTheDocument();
    });
    expect(screen.getByText('In Library')).toBeInTheDocument();
  });

  it('shows "Owned" status for completed source when owned', async () => {
    vi.mocked(api.getCompletedBook).mockResolvedValue({
      ...completedBook,
      id: 'completed_3',
      owned: 1
    });
    renderProfile('/completed-book/completed_3');
    await waitFor(() => {
      expect(screen.getByText('Completed Book')).toBeInTheDocument();
    });
    expect(screen.getByText('Owned')).toBeInTheDocument();
  });

  it('shows "Not Owned" status for completed source when not owned', async () => {
    renderProfile('/completed-book/completed_3');
    await waitFor(() => {
      expect(screen.getByText('Completed Book')).toBeInTheDocument();
    });
    expect(screen.getByText('Not Owned')).toBeInTheDocument();
  });

  it('hides Add to Library section for library source', async () => {
    renderProfile('/completed-book/library_5');
    await waitFor(() => {
      expect(screen.getByText('Library Book')).toBeInTheDocument();
    });
    expect(screen.queryByText('Add to Your Library')).not.toBeInTheDocument();
  });

  it('shows Add to Library section for completed source when not owned', async () => {
    renderProfile('/completed-book/completed_3');
    await waitFor(() => {
      expect(screen.getByText('Completed Book')).toBeInTheDocument();
    });
    expect(screen.getByText('Add to Your Library')).toBeInTheDocument();
  });

  it('delete button says "Mark as unread" for library source', async () => {
    renderProfile('/completed-book/library_5');
    await waitFor(() => {
      expect(screen.getByText('Library Book')).toBeInTheDocument();
    });
    expect(screen.getByTitle('Mark as unread')).toBeInTheDocument();
  });

  it('delete button says "Remove from completed books" for completed source', async () => {
    renderProfile('/completed-book/completed_3');
    await waitFor(() => {
      expect(screen.getByText('Completed Book')).toBeInTheDocument();
    });
    expect(screen.getByTitle('Remove from completed books')).toBeInTheDocument();
  });

  it('after Add to Library calls API and shows success then updates to new library book', async () => {
    const user = userEvent.setup();
    const newLibraryBook = { ...libraryBook, id: 'library_99', title: 'Completed Book', source: 'library' };
    vi.mocked(api.addCompletedBookToLibrary).mockResolvedValue({ book: newLibraryBook });

    render(
      <MemoryRouter initialEntries={['/completed-book/completed_3']}>
        <Routes>
          <Route path="/completed-book/:id" element={<CompletedBookProfile />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Completed Book')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Add to Library/i });
    const addBtn = addButtons.find(b => b.textContent?.includes('Add to Library')) || addButtons[1];
    await user.click(addBtn);

    expect(api.addCompletedBookToLibrary).toHaveBeenCalledWith('completed_3');
    await waitFor(() => {
      expect(screen.getByText(/"Completed Book" added to your library!/)).toBeInTheDocument();
    });
    expect(screen.getByText('In Library')).toBeInTheDocument();
  });
});
