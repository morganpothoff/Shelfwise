import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CompletedBookListItem from './CompletedBookListItem';

describe('CompletedBookListItem', () => {
  const defaultBook = {
    id: 'completed_1',
    title: 'List Book',
    author: 'List Author',
    source: 'completed',
    owned: 0
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
      onAddToLibrary: vi.fn(),
      showSeriesPosition: false,
      ...props
    };
    return render(
      <MemoryRouter>
        <CompletedBookListItem {...defaultProps} />
      </MemoryRouter>
    );
  }

  it('renders book title and author', () => {
    renderItem();
    expect(screen.getByText('List Book')).toBeInTheDocument();
    expect(screen.getByText(/by List Author/)).toBeInTheDocument();
  });

  it('shows "In Library" badge for library source', () => {
    renderItem({ ...defaultBook, id: 'library_5', source: 'library' });
    expect(screen.getByText('In Library')).toBeInTheDocument();
  });

  it('shows "Owned" badge for completed source when owned', () => {
    renderItem({ ...defaultBook, owned: 1 });
    expect(screen.getByText('Owned')).toBeInTheDocument();
  });

  it('shows Add to Library button only for completed source when not owned', () => {
    renderItem({ ...defaultBook, source: 'completed', owned: 0 });
    expect(screen.getByTitle('Add to library')).toBeInTheDocument();
  });

  it('hides Add to Library for library source', () => {
    renderItem({ ...defaultBook, id: 'library_5', source: 'library' });
    expect(screen.queryByTitle('Add to library')).not.toBeInTheDocument();
  });

  it('delete button title is "Mark as unread" for library source', () => {
    renderItem({ ...defaultBook, id: 'library_5', source: 'library' });
    expect(screen.getByTitle('Mark as unread')).toBeInTheDocument();
  });

  it('delete button title is "Remove from completed books" for completed source', () => {
    renderItem();
    expect(screen.getByTitle('Remove from completed books')).toBeInTheDocument();
  });
});
