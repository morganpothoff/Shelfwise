import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookListItem from './BookListItem';

describe('BookListItem', () => {
  const defaultBook = {
    id: 1,
    title: 'Test Book',
    author: 'Test Author',
    reading_status: 'unread'
  };

  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderItem(book = defaultBook, props = {}) {
    const defaultProps = {
      book,
      onDelete: vi.fn(),
      onEditSeries: vi.fn(),
      showSeriesPosition: false,
      ...props
    };
    return render(
      <MemoryRouter>
        <BookListItem {...defaultProps} />
      </MemoryRouter>
    );
  }

  it('renders book title and author', () => {
    renderItem();
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText(/by Test Author/)).toBeInTheDocument();
  });

  it('renders link to book profile', () => {
    renderItem();
    const link = screen.getByRole('link', { name: /test book/i });
    expect(link).toHaveAttribute('href', '/book/1');
  });

  it('shows series position when showSeriesPosition and book has series_position', () => {
    renderItem(
      { ...defaultBook, series_position: 3 },
      { showSeriesPosition: true }
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows Hidden indicator when visibility is hidden', () => {
    renderItem({ ...defaultBook, visibility: 'hidden' });
    expect(screen.getByText('🔒')).toBeInTheDocument();
  });

  it('shows N/A when visibility is not_available', () => {
    renderItem({ ...defaultBook, visibility: 'not_available' });
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('shows Read indicator when reading_status is read', () => {
    renderItem({ ...defaultBook, reading_status: 'read' });
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows Reading indicator when reading_status is reading', () => {
    renderItem({ ...defaultBook, reading_status: 'reading' });
    expect(screen.getByText('📖')).toBeInTheDocument();
  });

  it('calls onDelete with book id when delete confirmed', () => {
    const onDelete = vi.fn();
    renderItem(defaultBook, { onDelete });
    screen.getByTitle('Remove from library').click();
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Remove "Test Book" from your library?')
    );
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('calls onEditSeries with book when edit series clicked', () => {
    const onEditSeries = vi.fn();
    renderItem(defaultBook, { onEditSeries });
    screen.getByTitle('Edit series').click();
    expect(onEditSeries).toHaveBeenCalledWith(defaultBook);
  });
});
