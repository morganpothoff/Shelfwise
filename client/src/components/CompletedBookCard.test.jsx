import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CompletedBookCard from './CompletedBookCard';

describe('CompletedBookCard', () => {
  const defaultBook = {
    id: 'completed_1',
    title: 'Test Book',
    author: 'Test Author',
    source: 'completed',
    owned: 0,
    date_finished: '2024-01-15'
  };

  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderCard(book = defaultBook, props = {}) {
    const defaultProps = {
      book,
      onDelete: vi.fn(),
      onEditSeries: vi.fn(),
      onAddToLibrary: vi.fn(),
      showSeriesPosition: false,
      ...props
    };
    return render(
      <MemoryRouter>
        <CompletedBookCard {...defaultProps} />
      </MemoryRouter>
    );
  }

  it('renders book title and author', () => {
    renderCard();
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText(/by Test Author/)).toBeInTheDocument();
  });

  it('shows "In Library" badge for library source', () => {
    renderCard({ ...defaultBook, id: 'library_5', source: 'library' });
    expect(screen.getByText('In Library')).toBeInTheDocument();
  });

  it('shows "Owned" badge for completed source when owned', () => {
    renderCard({ ...defaultBook, owned: 1 });
    expect(screen.getByText('Owned')).toBeInTheDocument();
  });

  it('shows no owned badge for completed source when not owned', () => {
    renderCard({ ...defaultBook, owned: 0 });
    expect(screen.queryByText('Owned')).not.toBeInTheDocument();
    expect(screen.queryByText('In Library')).not.toBeInTheDocument();
  });

  it('shows Add to Library button only for completed source when not owned', () => {
    const { rerender } = renderCard({ ...defaultBook, source: 'completed', owned: 0 });
    expect(screen.getByTitle('Add to library')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <CompletedBookCard
          book={{ ...defaultBook, source: 'library' }}
          onDelete={vi.fn()}
          onEditSeries={vi.fn()}
          onAddToLibrary={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.queryByTitle('Add to library')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <CompletedBookCard
          book={{ ...defaultBook, source: 'completed', owned: 1 }}
          onDelete={vi.fn()}
          onEditSeries={vi.fn()}
          onAddToLibrary={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.queryByTitle('Add to library')).not.toBeInTheDocument();
  });

  it('delete button has "Mark as unread" title for library source', () => {
    renderCard({ ...defaultBook, id: 'library_5', source: 'library' });
    expect(screen.getByTitle('Mark as unread')).toBeInTheDocument();
  });

  it('delete button has "Remove from completed books" title for completed source', () => {
    renderCard();
    expect(screen.getByTitle('Remove from completed books')).toBeInTheDocument();
  });

  it('calls onDelete with book id when delete confirmed and library source', () => {
    const onDelete = vi.fn();
    renderCard(
      { ...defaultBook, id: 'library_5', source: 'library' },
      { onDelete }
    );
    screen.getByTitle('Mark as unread').click();
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Mark "Test Book" as unread?')
    );
    expect(onDelete).toHaveBeenCalledWith('library_5');
  });

  it('calls onDelete with book id when delete confirmed and completed source', () => {
    const onDelete = vi.fn();
    renderCard(defaultBook, { onDelete });
    screen.getByTitle('Remove from completed books').click();
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Remove "Test Book" from your completed books?')
    );
    expect(onDelete).toHaveBeenCalledWith('completed_1');
  });
});
