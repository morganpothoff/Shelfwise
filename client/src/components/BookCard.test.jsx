import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookCard from './BookCard';

describe('BookCard', () => {
  const defaultBook = {
    id: 1,
    title: 'Test Book',
    author: 'Test Author',
    reading_status: 'unread',
    page_count: 300,
    genre: 'Fiction',
    synopsis: 'A test synopsis.'
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
      showSeriesPosition: false,
      ...props
    };
    return render(
      <MemoryRouter>
        <BookCard {...defaultProps} />
      </MemoryRouter>
    );
  }

  it('renders book title and author', () => {
    renderCard();
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText(/by Test Author/)).toBeInTheDocument();
  });

  it('renders link to book profile', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /test book/i });
    expect(link).toHaveAttribute('href', '/book/1');
  });

  it('shows series position when showSeriesPosition and book has series_position', () => {
    renderCard(
      { ...defaultBook, series_position: 2 },
      { showSeriesPosition: true }
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows Hidden badge when visibility is hidden', () => {
    renderCard({ ...defaultBook, visibility: 'hidden' });
    expect(screen.getByText(/Hidden/)).toBeInTheDocument();
  });

  it('shows Not Available badge when visibility is not_available', () => {
    renderCard({ ...defaultBook, visibility: 'not_available' });
    expect(screen.getByText('Not Available')).toBeInTheDocument();
  });

  it('shows Read badge when reading_status is read', () => {
    renderCard({ ...defaultBook, reading_status: 'read' });
    expect(screen.getByText('✓ Read')).toBeInTheDocument();
  });

  it('shows Reading badge when reading_status is reading', () => {
    renderCard({ ...defaultBook, reading_status: 'reading' });
    expect(screen.getByText('📖 Reading')).toBeInTheDocument();
  });

  it('shows page count when present', () => {
    renderCard();
    expect(screen.getByText('300 pages')).toBeInTheDocument();
  });

  it('shows genre when present', () => {
    renderCard();
    expect(screen.getByText('Fiction')).toBeInTheDocument();
  });

  it('calls onDelete with book id when delete confirmed', () => {
    const onDelete = vi.fn();
    renderCard(defaultBook, { onDelete });
    screen.getByTitle('Remove from library').click();
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Remove "Test Book" from your library?')
    );
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('calls onEditSeries with book when edit series clicked', () => {
    const onEditSeries = vi.fn();
    renderCard(defaultBook, { onEditSeries });
    screen.getByTitle('Edit series').click();
    expect(onEditSeries).toHaveBeenCalledWith(defaultBook);
  });
});
