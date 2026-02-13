import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddCompletedBookConfirmModal from './AddCompletedBookConfirmModal';

describe('AddCompletedBookConfirmModal', () => {
  const defaultBook = { title: 'The Poppy War', author: 'R.F. Kuang' };
  const defaultProps = {
    book: defaultBook,
    onConfirm: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('renders book title and author', () => {
    render(<AddCompletedBookConfirmModal {...defaultProps} />);
    expect(screen.getByText('The Poppy War')).toBeInTheDocument();
    expect(screen.getByText(/by R.F. Kuang/)).toBeInTheDocument();
  });

  it('renders heading and optional date label', () => {
    render(<AddCompletedBookConfirmModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Add to Books Completed/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Date finished.*optional/i)).toBeInTheDocument();
  });

  it('renders Cancel and Add to Books Completed buttons', () => {
    render(<AddCompletedBookConfirmModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Books Completed/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    render(<AddCompletedBookConfirmModal {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onClose when Close (×) button is clicked', async () => {
    const onClose = vi.fn();
    render(<AddCompletedBookConfirmModal book={defaultBook} onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with null when date is empty and Add is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<AddCompletedBookConfirmModal book={defaultBook} onConfirm={onConfirm} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /Add to Books Completed/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(null);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with date string when date is set and Add is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<AddCompletedBookConfirmModal book={defaultBook} onConfirm={onConfirm} onClose={onClose} />);
    const dateInput = screen.getByLabelText(/Date finished/i);
    fireEvent.change(dateInput, { target: { value: '2024-06-15' } });
    await userEvent.click(screen.getByRole('button', { name: /Add to Books Completed/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('2024-06-15');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose if onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('API error'));
    const onClose = vi.fn();
    render(<AddCompletedBookConfirmModal book={defaultBook} onConfirm={onConfirm} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /Add to Books Completed/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders without author when book has no author', () => {
    render(<AddCompletedBookConfirmModal book={{ title: 'No Author Book' }} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('No Author Book')).toBeInTheDocument();
    expect(screen.queryByText(/by /)).not.toBeInTheDocument();
  });
});
